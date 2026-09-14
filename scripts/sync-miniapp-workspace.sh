#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-miniapp-workspace.sh
# 同步 h5 小程序构建模板 → 生产服务器小程序构建 workspace（/data/miniapp/workspace）
#
# 背景：服务器端 Miniapp 构建 Job（scrm-platform app/Modules/Miniapp，
# MiniappBuildService::prepareWorkDir）以 /data/miniapp/workspace 为模板源，
# rsync 到每次构建的工作目录后再 pnpm install + build:mp-weixin。
# workspace 与代码仓库脱钩（服务器无 .git、无仓库），需在 h5 工程发版后
# 手动同步一次模板，构建 Job 才能拿到最新页面/依赖声明。
#
# 用法：
#   bash scripts/sync-miniapp-workspace.sh            # 正式同步
#   bash scripts/sync-miniapp-workspace.sh --dry-run  # 预演（rsync -n，不落盘）
#
# 配置：主机复用 deploy/config.env（SERVER_HOST / SERVER_USER，root 免密 ssh，
# 与 deploy.py 同款 BatchMode）。可用环境变量覆盖：
#   SERVER_HOST / SERVER_USER / MINIAPP_WORKSPACE（默认 /data/miniapp/workspace）
#
# 同步范围 = plan D 节契约（apps/h5 + packages/* + 根工作区文件），排除项与
# MiniappBuildService::prepareWorkDir 的 rsync 对齐（node_modules/dist/.git/
# .vite/.mimocode/*.log），保证两段 rsync 行为一致：
#   - node_modules 不删除：服务器已装依赖/缓存跨同步保留
#   - dist/.git/.vite/.mimocode 不入模板，避免污染构建产物
# 根级构建无关杂项（docs/skills/configs/deploy/.husky 等）一并排除。
#
# 服务器初始化（一次性，plan D 节）：装 pnpm、mkdir workspace、本脚本全量
# 同步后首跑 `pnpm install --frozen-lockfile`（Job 内为 --prefer-offline 复用）。
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/deploy/config.env"

# ---- 读取发布配置（与 deploy.py 同源；环境变量可覆盖） ----
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi
SERVER_HOST="${SERVER_HOST:-}"
SERVER_USER="${SERVER_USER:-root}"
DST_DIR="${MINIAPP_WORKSPACE:-/data/miniapp/workspace}"

if [[ -z "$SERVER_HOST" ]]; then
  echo "[sync-miniapp-workspace] 错误: 未配置 SERVER_HOST（请检查 deploy/config.env）" >&2
  exit 1
fi

SSH_TARGET="${SERVER_USER}@${SERVER_HOST}"
SSH_OPTS=(-o BatchMode=yes -o LogLevel=ERROR)

# ---- dry-run 预演 ----
RSYNC_DRY=()
if [[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]]; then
  RSYNC_DRY=(-n)
fi

# ---- rsync 同步 ----
# 排除项顺序敏感：先精确根级杂项，再全局目录类（--exclude node_modules 匹配任意层级，
# 与 MiniappBuildService 的 rsync 保持同一套规则）。
EXCLUDES=(
  --exclude '/docs'
  --exclude '/skills'
  --exclude '/scripts'
  --exclude '/configs'
  --exclude '/deploy'
  --exclude '/.husky'
  --exclude '/.mimocode'
  --exclude '/.git'
  --exclude '.vite'
  --exclude node_modules
  --exclude dist
  --exclude '*.log'
  --exclude '.DS_Store'
)

echo "[sync-miniapp-workspace] $PROJECT_ROOT/ → ${SSH_TARGET}:${DST_DIR}/"
rsync -avz --delete "${RSYNC_DRY[@]}" \
  "${EXCLUDES[@]}" \
  -e "ssh ${SSH_OPTS[*]}" \
  "$PROJECT_ROOT/" "${SSH_TARGET}:${DST_DIR}/"

echo "[sync-miniapp-workspace] 同步完成：${DST_DIR}"
echo "  提示: 若服务器 workspace 首次初始化，请执行 pnpm install --frozen-lockfile（Job 内 --prefer-offline 依赖其 store 缓存）"
