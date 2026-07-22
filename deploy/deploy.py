#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scrm-platform-front 前台发布脚本（自包含，仅 Python 标准库）。

前台为 pnpm monorepo（apps/* + packages/shared）。SPA 产物是打包 bundle，
无法按源文件增量；故前台「增量」= 仅重建并重部署「有改动的 app」（full = 重建全部 app）。

App→目标映射（内置默认，可用 config.env 覆盖）：
  h5  : build:h5  -> apps/h5/dist/build/h5/        -> <WEB_ROOT>/public/h5
  ops : build:ops -> apps/ops-console/dist/build/h5/ -> <WEB_ROOT>/public/console

支持命令：
  status        只读：上次commit/当前HEAD/改动文件/受影响 app
  full          全量发布（pnpm install + 逐 app build + rsync --delete 产物）
  incremental   增量发布（git diff 判定受影响 app，仅重建+重部署这些 app）
  module        发布指定 app（--app h5|ops，等价单 app 构建部署）
  db            N/A（前台无数据库，仅提示）

安全不变量：状态仅成功后写入、基线缺失回退 full、脏工作区保护、
rsync --delete 仅限各 app 的受管目标目录、构建失败则不部署。
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

PROJECT_KEY = "scrm-platform-front"
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CONFIG_FILE = SCRIPT_DIR / "config.env"

# App 内置默认映射：name -> (build_script, dist_rel, target_rel)
#   build_script: 根 package.json 中的脚本名（pnpm run <script>）
#   dist_rel:     构建产物目录（相对仓库根）
#   target_rel:   服务器目标目录（相对 WEB_ROOT）
APP_MAP = {
    "h5": ("build:h5", "apps/h5/dist/build/h5", "public/h5"),
    "ops": ("build:ops", "apps/ops-console/dist/build/h5", "public/console"),
}
# app name -> 源码目录前缀（用于受影响判定）
APP_SOURCE_DIRS = {
    "h5": "apps/h5",
    "ops": "apps/ops-console",
}
# 共享路径前缀：改动则所有 app 受影响
SHARED_PREFIXES = ["packages/"]
# 根级文件：改动则所有 app 受影响（依赖/工作区/构建配置）
ROOT_ALL_PREFIXES = ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json", ".npmrc"]

# ---- 运行态 ----
CFG = {}
DRY_RUN = False
VERBOSE = False
ASSUME_YES = False


# ============================ 基础工具 ============================
def log(msg, level="INFO"):
    colors = {"INFO": "\033[0m", "CMD": "\033[2m", "DRY": "\033[36m",
              "OK": "\033[32m", "WARN": "\033[33m", "ERROR": "\033[31m"}
    reset = "\033[0m"
    c = colors.get(level, "")
    print(f"{c}[{level}]{reset} {msg}", flush=True)


def die(msg, code=1):
    log(msg, "ERROR")
    sys.exit(code)


def load_config():
    global CFG, APP_MAP
    if not CONFIG_FILE.exists():
        die(f"缺少配置文件 {CONFIG_FILE}\n请复制 config.example.env 为 config.env 并填写服务器凭证")
    cfg = {}
    for line in CONFIG_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")
    required = ["SERVER_HOST", "SERVER_USER", "WEB_ROOT"]
    missing = [k for k in required if not cfg.get(k)]
    if missing:
        die(f"config.env 缺少必填项: {', '.join(missing)}")
    cfg.setdefault("PNPM_BIN", "pnpm")
    CFG = cfg
    # config.env 覆盖 app 映射：APP_<NAME>_BUILD / _DIST / _TARGET
    for name, (b, d, t) in list(APP_MAP.items()):
        ub = cfg.get(f"APP_{name.upper()}_BUILD", b)
        ud = cfg.get(f"APP_{name.upper()}_DIST", d)
        ut = cfg.get(f"APP_{name.upper()}_TARGET", t)
        APP_MAP[name] = (ub, ud, ut)
    return cfg


def ssh_target():
    return f"{CFG['SERVER_USER']}@{CFG['SERVER_HOST']}"


def run_local(cmd, check=True, capture=False, cwd=None):
    """本地执行命令（列表参数）。"""
    if VERBOSE:
        log(f"$ {' '.join(str(c) for c in cmd)}", "CMD")
    res = subprocess.run(cmd, cwd=str(cwd or PROJECT_ROOT),
                         capture_output=capture, text=True)
    if check and res.returncode != 0:
        err = (res.stderr or "") if capture else ""
        die(f"本地命令失败 (rc={res.returncode}): {' '.join(str(c) for c in cmd)}\n{err}")
    return res


def git(*args, check=True):
    res = subprocess.run(["git", *args], cwd=PROJECT_ROOT,
                         capture_output=True, text=True)
    if check and res.returncode != 0:
        die(f"git {' '.join(args)} 失败:\n{res.stderr}")
    return res.stdout


def ssh_run(cmd, check=True, capture=True):
    if VERBOSE:
        log(f"$ ssh {ssh_target()} \"{cmd}\"", "CMD")
    res = subprocess.run(["ssh", "-o", "BatchMode=yes", "-o", "LogLevel=ERROR",
                          ssh_target(), cmd], capture_output=capture, text=True)
    if check and res.returncode != 0:
        err = (res.stderr or "") if capture else ""
        die(f"远程命令失败 (rc={res.returncode}): {cmd}\n{err}")
    return res


def ssh_exec(cmd, check=True):
    if DRY_RUN:
        log(f"[dry-run] ssh: {cmd}", "DRY")
        return None
    return ssh_run(cmd, check=check)


# ============================ rsync ============================
def rsync_dist(app):
    """rsync --delete 本地产物目录 -> 服务器 public/<target>/"""
    _build, dist_rel, target_rel = APP_MAP[app]
    src = str(PROJECT_ROOT / dist_rel) + "/"
    dst = f"{ssh_target()}:{CFG['WEB_ROOT']}/{target_rel}/"
    if not (PROJECT_ROOT / dist_rel).is_dir():
        if DRY_RUN:
            log(f"[dry-run] 产物目录 {dist_rel} 尚不存在（构建后生成），跳过 rsync 预演", "DRY")
            return
        die(f"产物目录不存在: {dist_rel}（构建可能失败）")
    cmd = ["rsync", "-avz", "--delete"]
    if DRY_RUN:
        cmd.append("--dry-run")
    cmd += ["-e", "ssh -o BatchMode=yes -o LogLevel=ERROR", src, dst]
    log(f"rsync 产物 {app}: {dist_rel}/ -> {target_rel}/ (--delete)")
    run_local(cmd)


# ============================ 状态文件 ============================
def state_path():
    return f"{CFG['WEB_ROOT']}/.deploy-state.json"


def read_state():
    res = ssh_run(f"cat {state_path()} 2>/dev/null || echo '{{}}'", check=False)
    try:
        return json.loads(res.stdout or "{}")
    except json.JSONDecodeError:
        return {}


def write_state(commit):
    state = read_state()
    state[PROJECT_KEY] = commit
    state["_last_deploy"] = datetime.now().isoformat(timespec="seconds")
    payload = json.dumps(state, ensure_ascii=False, indent=2)
    if DRY_RUN:
        log(f"[dry-run] 写状态 {PROJECT_KEY}={commit}", "DRY")
        return
    ssh_run(f"cat > {state_path()} << 'DEPLOY_STATE_EOF'\n{payload}\nDEPLOY_STATE_EOF")
    log(f"状态已更新: {PROJECT_KEY}={commit}", "OK")


def last_commit():
    return read_state().get(PROJECT_KEY)


# ============================ git 分析 ============================
def head_commit():
    return git("rev-parse", "HEAD").strip()


def commit_exists(commit):
    res = subprocess.run(["git", "cat-file", "-e", commit],
                         cwd=PROJECT_ROOT, capture_output=True)
    return res.returncode == 0


def changed_files(last, include_worktree=False):
    """自基线（含工作区）的改动文件列表。"""
    spec = last if include_worktree else f"{last}..HEAD"
    files = [f for f in git("diff", "--name-only", spec).splitlines() if f.strip()]
    if include_worktree:
        untracked = git("ls-files", "--others", "--exclude-standard").splitlines()
        for f in untracked:
            f = f.strip()
            if f and f not in files:
                files.append(f)
    return files


def affected_apps(files):
    """由改动文件判定受影响的 app 集合。"""
    affected = set()
    all_apps = set(APP_MAP.keys())
    for f in files:
        # 共享/根配置改动 → 全部 app 受影响
        if any(f == p or f.startswith(p) for p in ROOT_ALL_PREFIXES):
            return all_apps
        if any(f == p or f.startswith(p) for p in SHARED_PREFIXES):
            affected |= all_apps
            continue
        for name, src_dir in APP_SOURCE_DIRS.items():
            if f == src_dir or f.startswith(src_dir + "/"):
                affected.add(name)
    return affected


def present_apps():
    """源码目录实际存在的 app（ops-console 未创建则不部署）。"""
    return [name for name in APP_MAP
            if (PROJECT_ROOT / APP_SOURCE_DIRS[name]).is_dir()]


def dirty_paths():
    out = git("status", "--porcelain", "--", "apps", "packages",
              "pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json")
    return [ln for ln in out.splitlines() if ln.strip()]


# ============================ 部署动作 ============================
def confirm(msg):
    if ASSUME_YES or DRY_RUN:
        return True
    try:
        resp = input(f"{msg} [y/N]: ").strip().lower()
    except EOFError:
        return False
    return resp in ("y", "yes")


def pnpm_install():
    log("pnpm install（按需安装依赖）")
    if DRY_RUN:
        log(f"[dry-run] {CFG['PNPM_BIN']} install", "DRY")
        return
    run_local([CFG["PNPM_BIN"], "install"])


def build_app(app):
    build_script, dist_rel, _target = APP_MAP[app]
    log(f"构建 {app}: pnpm run {build_script} -> {dist_rel}/")
    if DRY_RUN:
        log(f"[dry-run] {CFG['PNPM_BIN']} run {build_script}", "DRY")
        return
    run_local([CFG["PNPM_BIN"], "run", build_script])
    if not (PROJECT_ROOT / dist_rel).is_dir():
        die(f"{app} 构建后未找到产物目录 {dist_rel}，中止部署")
    log(f"{app} 构建完成", "OK")


def deploy_apps(apps, with_install=True):
    """构建并部署一组 app。"""
    apps = [a for a in apps if a in present_apps()]
    if not apps:
        log("无可部署的 app（源码目录均不存在）", "WARN")
        return
    if with_install:
        pnpm_install()
    for app in apps:
        build_app(app)
        rsync_dist(app)


# ============================ 命令实现 ============================
def resolve_baseline(args):
    last = last_commit()
    if not last:
        log("服务器无部署基线（首次部署）→ 回退 full", "WARN")
        return None
    if not commit_exists(last):
        log(f"基线 commit {last} 在本地仓库不存在（rebase/GC）→ 回退 full", "WARN")
        return None
    return last


def check_dirty(args):
    dirty = dirty_paths()
    if dirty:
        log(f"检测到 {len(dirty)} 处未提交改动:", "WARN")
        for ln in dirty[:20]:
            print(f"  {ln}", flush=True)
        if not getattr(args, "allow_dirty", False):
            die("工作区不干净。请先 git commit，或加 --allow-dirty 连同工作区部署。")
        log("--allow-dirty：将连同工作区改动一起部署", "WARN")
    return bool(dirty)


def cmd_status(args):
    head = head_commit()
    last = last_commit()
    print("=" * 60, flush=True)
    print(f"项目:        {PROJECT_KEY}（前台 SPA）")
    print(f"本地 HEAD:   {head}")
    print(f"上次部署:    {last or '(无 → 下次 incremental 将回退 full)'}")
    if last and not commit_exists(last):
        print("  ⚠ 基线 commit 本地不存在 → incremental 将回退 full")
    print(f"已就绪 app:  {', '.join(present_apps()) or '(无)'}")
    print("-" * 60, flush=True)
    if last and commit_exists(last):
        files = changed_files(last)
        aff = affected_apps(files)
        print(f"自上次部署改动: {len(files)} 个文件")
        for f in files[:40]:
            print(f"  · {f}")
        if len(files) > 40:
            print(f"  ... 另有 {len(files) - 40} 个")
        print(f"受影响 app: {', '.join(sorted(aff)) or '(无)'}")
    print("-" * 60, flush=True)
    dirty = dirty_paths()
    print(f"未提交改动:  {len(dirty)} 处" + ("（建议先提交）" if dirty else ""))
    print("=" * 60, flush=True)


def cmd_full(args):
    log("=== 全量发布 scrm-platform-front（前台）===")
    apps = present_apps()
    if not apps:
        die("无可部署的 app（apps/ 下源码目录均不存在）")
    if not confirm(f"即将全量构建并部署 {', '.join(apps)}，继续?"):
        log("已取消"); return
    deploy_apps(apps, with_install=not args.no_install)
    write_state(head_commit())
    log("=== 前台全量发布完成 ===", "OK")


def cmd_incremental(args):
    last = resolve_baseline(args)
    if last is None:
        log("回退到全量发布", "WARN")
        return cmd_full(args)
    dirty = check_dirty(args)
    files = changed_files(last, include_worktree=dirty)
    aff = sorted(affected_apps(files))
    log(f"=== 增量发布 scrm-platform-front（基线 {last[:8]}）===")
    log(f"改动 {len(files)} 个文件 → 受影响 app: {', '.join(aff) or '(无)'}")
    if not aff:
        log("无受影响 app，无需部署")
        write_state(head_commit())
        log("=== 前台增量发布完成 ===", "OK")
        return
    if not confirm(f"即将重建并部署受影响 app: {', '.join(aff)}，继续?"):
        log("已取消"); return
    deploy_apps(aff, with_install=not args.no_install)
    write_state(head_commit())
    log("=== 前台增量发布完成 ===", "OK")


def cmd_module(args):
    if not args.app:
        die("module 命令需要 --app h5|ops")
    names = [n.strip() for n in args.app.split(",") if n.strip()]
    bad = [n for n in names if n not in APP_MAP]
    if bad:
        die(f"未知 app: {', '.join(bad)}\n可用 app: {', '.join(APP_MAP.keys())}")
    missing = [n for n in names if n not in present_apps()]
    if missing:
        die(f"app 源码目录不存在: {', '.join(missing)}")
    log(f"=== 前台 app 发布: {', '.join(names)} ===")
    if not confirm(f"即将构建并部署 app {', '.join(names)}，继续?"):
        log("已取消"); return
    deploy_apps(names, with_install=not args.no_install)
    write_state(head_commit())
    log("=== 前台 app 发布完成 ===", "OK")


def cmd_db(args):
    log("前台项目无数据库，无需 db 发布。", "WARN")
    log("如需迁移数据库，请运行后台发布脚本：")
    log("  cd ../scrm-platform && python3 deploy/deploy.py db")


# ============================ 入口 ============================
def build_parser():
    p = argparse.ArgumentParser(description="scrm-platform-front 前台发布脚本")
    p.add_argument("command", choices=["status", "full", "incremental", "db", "module"],
                   help="发布命令")
    p.add_argument("--dry-run", action="store_true", help="只打印不执行（跳过构建）")
    p.add_argument("--yes", action="store_true", help="跳过确认")
    p.add_argument("--app", help="app 名（module 命令，可逗号分隔：h5,ops）")
    p.add_argument("--no-install", action="store_true", help="跳过 pnpm install")
    p.add_argument("--allow-dirty", action="store_true", help="允许连同未提交改动一起部署")
    p.add_argument("-v", "--verbose", action="store_true", help="详细输出")
    return p


def main():
    global DRY_RUN, VERBOSE, ASSUME_YES
    args = build_parser().parse_args()
    DRY_RUN = args.dry_run
    VERBOSE = args.verbose
    ASSUME_YES = args.yes
    load_config()
    if DRY_RUN:
        log("DRY-RUN 模式：跳过构建，变更操作只打印不执行", "DRY")
    handlers = {
        "status": cmd_status,
        "full": cmd_full,
        "incremental": cmd_incremental,
        "db": cmd_db,
        "module": cmd_module,
    }
    handlers[args.command](args)


if __name__ == "__main__":
    main()
