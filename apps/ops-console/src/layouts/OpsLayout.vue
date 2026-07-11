<template>
  <el-container class="ops-layout">
    <!-- PC 端侧边栏 -->
    <el-aside v-if="!isMobile" :width="isCollapse ? '64px' : '220px'" class="ops-sidebar">
      <div class="logo">
        <span v-if="!isCollapse">SCRM 运营台</span>
        <span v-else>S</span>
      </div>
      <el-scrollbar>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          router
          class="ops-menu"
          :unique-opened="true"
        >
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon>
            <span>运营看板</span>
          </el-menu-item>

          <el-sub-menu index="group-customer">
            <template #title>
              <el-icon><User /></el-icon>
              <span>客户运营</span>
            </template>
            <el-menu-item index="/customers">
              <el-icon><UserFilled /></el-icon><span>客户管理</span>
            </el-menu-item>
            <el-menu-item index="/tags">
              <el-icon><PriceTag /></el-icon><span>标签管理</span>
            </el-menu-item>
            <el-menu-item index="/conversations">
              <el-icon><ChatDotRound /></el-icon><span>会话记录</span>
            </el-menu-item>
            <el-menu-item index="/journey">
              <el-icon><Position /></el-icon><span>客户旅程</span>
            </el-menu-item>
            <el-menu-item index="/staff">
              <el-icon><Avatar /></el-icon><span>员工管理</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-growth">
            <template #title>
              <el-icon><Connection /></el-icon>
              <span>获客与社群</span>
            </template>
            <el-menu-item index="/channels">
              <el-icon><Share /></el-icon><span>渠道管理</span>
            </el-menu-item>
            <el-menu-item index="/live-codes">
              <el-icon><Iphone /></el-icon><span>活码管理</span>
            </el-menu-item>
            <el-menu-item index="/communities">
              <el-icon><ChatSquare /></el-icon><span>社群管理</span>
            </el-menu-item>
            <el-menu-item index="/campaign">
              <el-icon><Present /></el-icon><span>营销活动</span>
            </el-menu-item>
            <el-menu-item index="/pipeline">
              <el-icon><Files /></el-icon><span>管道/阶段</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-content">
            <template #title>
              <el-icon><FolderOpened /></el-icon>
              <span>内容与自动化</span>
            </template>
            <el-menu-item index="/materials">
              <el-icon><Picture /></el-icon><span>素材管理</span>
            </el-menu-item>
            <el-menu-item index="/automations">
              <el-icon><Setting /></el-icon><span>自动化规则</span>
            </el-menu-item>
            <el-menu-item index="/wechat">
              <el-icon><ChatLineRound /></el-icon><span>微信配置</span>
            </el-menu-item>
            <el-menu-item index="/knowledge">
              <el-icon><Document /></el-icon><span>知识库</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-ai">
            <template #title>
              <el-icon><MagicStick /></el-icon>
              <span>AI 能力</span>
            </template>
            <el-menu-item index="/agents">
              <el-icon><Cpu /></el-icon><span>AI Agent</span>
            </el-menu-item>
            <el-menu-item index="/external-kb">
              <el-icon><Collection /></el-icon><span>外部知识库</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-system">
            <template #title>
              <el-icon><Tools /></el-icon>
              <span>系统</span>
            </template>
            <el-menu-item index="/risk">
              <el-icon><WarnTriangleFilled /></el-icon><span>风控合规</span>
            </el-menu-item>
            <el-menu-item index="/permission">
              <el-icon><Lock /></el-icon><span>角色权限</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-content-marketing">
            <template #title>
              <el-icon><Picture /></el-icon>
              <span>内容营销</span>
            </template>
            <el-menu-item index="/posters"><span>海报管理</span></el-menu-item>
            <el-menu-item index="/moments-sop"><span>朋友圈 SOP</span></el-menu-item>
            <el-menu-item index="/scripts"><span>话术库</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-membership">
            <template #title>
              <el-icon><User /></el-icon>
              <span>会员运营</span>
            </template>
            <el-menu-item index="/membership/levels"><span>会员等级</span></el-menu-item>
            <el-menu-item index="/membership/points"><span>积分系统</span></el-menu-item>
            <el-menu-item index="/membership/achievements"><span>成就体系</span></el-menu-item>
            <el-menu-item index="/membership/cards"><span>会员卡/储值卡</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-fission">
            <template #title>
              <el-icon><Present /></el-icon>
              <span>裂变活动</span>
            </template>
            <el-menu-item index="/coupons"><span>优惠券</span></el-menu-item>
            <el-menu-item index="/fissions"><span>裂变活动</span></el-menu-item>
            <el-menu-item index="/lotteries"><span>抽奖活动</span></el-menu-item>
            <el-menu-item index="/surveys"><span>问卷表单</span></el-menu-item>
            <el-menu-item index="/votings"><span>投票活动</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-wecom">
            <template #title>
              <el-icon><ChatDotRound /></el-icon>
              <span>企微运营</span>
            </template>
            <el-menu-item index="/mass-push"><span>群发助手</span></el-menu-item>
            <el-menu-item index="/welcome"><span>欢迎语</span></el-menu-item>
            <el-menu-item index="/inheritance"><span>离职继承</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-analytics">
            <template #title>
              <el-icon><DataLine /></el-icon>
              <span>数据分析</span>
            </template>
            <el-menu-item index="/analytics/profile"><span>客户深度画像</span></el-menu-item>
            <el-menu-item index="/analytics/funnel"><span>转化漏斗</span></el-menu-item>
            <el-menu-item index="/analytics/churn"><span>流失预警</span></el-menu-item>
            <el-menu-item index="/analytics/community"><span>社群活跃度</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-reach">
            <template #title>
              <el-icon><Bell /></el-icon>
              <span>触达运营</span>
            </template>
            <el-menu-item index="/scheduled-reach"><span>定时触达</span></el-menu-item>
            <el-menu-item index="/sms"><span>短信营销</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="group-commerce">
            <template #title>
              <el-icon><ShoppingCart /></el-icon>
              <span>交易转化</span>
            </template>
            <el-menu-item index="/products"><span>商品管理</span></el-menu-item>
            <el-menu-item index="/distribution"><span>分销管理</span></el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <el-header class="ops-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-icon :size="18" class="action-icon" @click="uiStore.toggleTheme()">
            <Moon v-if="!uiStore.isDark" />
            <Sunny v-else />
          </el-icon>
          <el-badge :value="3" :max="99">
            <el-icon :size="18" class="action-icon" @click="notifDrawer = true">
              <Bell />
            </el-icon>
          </el-badge>
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" />
              <span class="username">{{ authStore.user?.name || '运营人员' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goToConsole">租户管理</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="ops-main" :class="{ 'ops-main--mobile': isMobile }">
        <router-view />
      </el-main>
    </el-container>

    <!-- 移动端底部 TabBar -->
    <div v-if="isMobile" class="mobile-tabbar">
      <div
        class="tabbar-item"
        :class="{ active: activeMenu === '/dashboard' }"
        @click="router.push('/dashboard')"
      >
        <el-icon :size="22"><Odometer /></el-icon>
        <span>看板</span>
      </div>
      <div
        class="tabbar-item"
        :class="{ active: activeMenu.startsWith('/customers') }"
        @click="router.push('/customers')"
      >
        <el-icon :size="22"><User /></el-icon>
        <span>客户</span>
      </div>
      <div
        class="tabbar-item"
        :class="{ active: activeMenu.startsWith('/communities') }"
        @click="router.push('/communities')"
      >
        <el-icon :size="22"><ChatSquare /></el-icon>
        <span>社群</span>
      </div>
      <div
        class="tabbar-item"
        :class="{ active: activeMenu.startsWith('/agents') }"
        @click="router.push('/agents')"
      >
        <el-icon :size="22"><Cpu /></el-icon>
        <span>Agent</span>
      </div>
      <div class="tabbar-item" @click="moreDrawer = true">
        <el-icon :size="22"><MoreFilled /></el-icon>
        <span>更多</span>
      </div>
    </div>

    <!-- 移动端「更多」菜单 -->
    <el-drawer v-model="moreDrawer" title="全部菜单" direction="btt" size="60%">
      <el-menu :default-active="activeMenu" router @select="moreDrawer = false">
        <el-menu-item index="/channels"
          ><el-icon><Share /></el-icon>渠道管理</el-menu-item
        >
        <el-menu-item index="/live-codes"
          ><el-icon><Iphone /></el-icon>活码管理</el-menu-item
        >
        <el-menu-item index="/tags"
          ><el-icon><PriceTag /></el-icon>标签管理</el-menu-item
        >
        <el-menu-item index="/conversations"
          ><el-icon><ChatDotRound /></el-icon>会话记录</el-menu-item
        >
        <el-menu-item index="/journey"
          ><el-icon><Position /></el-icon>客户旅程</el-menu-item
        >
        <el-menu-item index="/staff"
          ><el-icon><Avatar /></el-icon>员工管理</el-menu-item
        >
        <el-menu-item index="/materials"
          ><el-icon><Picture /></el-icon>素材管理</el-menu-item
        >
        <el-menu-item index="/automations"
          ><el-icon><Setting /></el-icon>自动化规则</el-menu-item
        >
        <el-menu-item index="/wechat"
          ><el-icon><ChatLineRound /></el-icon>微信配置</el-menu-item
        >
        <el-menu-item index="/knowledge"
          ><el-icon><Document /></el-icon>知识库</el-menu-item
        >
        <el-menu-item index="/external-kb"
          ><el-icon><Collection /></el-icon>外部知识库</el-menu-item
        >
        <el-menu-item index="/campaign"
          ><el-icon><Present /></el-icon>营销活动</el-menu-item
        >
        <el-menu-item index="/pipeline"
          ><el-icon><Files /></el-icon>管道/阶段</el-menu-item
        >
        <el-menu-item index="/risk"
          ><el-icon><WarnTriangleFilled /></el-icon>风控合规</el-menu-item
        >
        <el-menu-item index="/permission"
          ><el-icon><Lock /></el-icon>角色权限</el-menu-item
        >
      </el-menu>
    </el-drawer>

    <el-drawer v-model="notifDrawer" title="通知中心" size="400px">
      <NotificationCenter />
    </el-drawer>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import NotificationCenter from '@/views/notifications/NotificationCenter.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const authStore = useAuthStore()
const notifDrawer = ref(false)
const moreDrawer = ref(false)

const isMobile = useMediaQuery('(max-width: 1023px)')
const isCollapse = computed(() => uiStore.sidebarCollapsed)
const activeMenu = computed(() => route.path)

function toggleCollapse() {
  uiStore.toggleSidebar()
}

function goToConsole() {
  window.location.href = '/console/'
}

function handleLogout() {
  authStore.logout()
}
</script>

<style scoped lang="scss">
.ops-layout {
  height: 100vh;
}

.ops-sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;

  .logo {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .ops-menu {
    border-right: none;
    background-color: #304156;

    :deep(.el-menu-item),
    :deep(.el-sub-menu__title) {
      color: #bfcbd9;
      &:hover {
        background-color: #263445;
      }
    }
    :deep(.el-menu-item.is-active) {
      color: #409eff;
      background-color: #1f2d3d;
    }
    :deep(.el-sub-menu .el-menu) {
      background-color: #1f2d3d;
    }
  }
}

.ops-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
    .action-icon {
      cursor: pointer;
      color: #606266;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      .username {
        font-size: 14px;
      }
    }
  }
}

.ops-main {
  background-color: #f0f2f5;
  padding: 20px;

  &--mobile {
    padding: 12px;
    padding-bottom: 70px; /* 为 TabBar 留空间 */
  }
}

/* 移动端底部 TabBar */
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #fff;
  border-top: 1px solid #e6e6e6;
  z-index: 2000;

  .tabbar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 11px;
    color: #909399;
    cursor: pointer;
    transition: color 0.2s;

    &.active {
      color: #409eff;
    }
  }
}

/* 暗色模式 */
html.dark {
  .ops-header {
    background: #1d1e1f;
    border-bottom-color: #414243;
  }
  .ops-main {
    background-color: #141414;
  }
  .mobile-tabbar {
    background: #1d1e1f;
    border-top-color: #414243;
  }
  .mobile-tabbar .tabbar-item {
    color: #606266;
  }
  .mobile-tabbar .tabbar-item.active {
    color: #409eff;
  }
}
</style>
