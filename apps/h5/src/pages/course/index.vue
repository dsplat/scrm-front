<template>
  <CourseListView :refresh-tick="tick" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CourseListView } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useSeoMeta } from '../../composables/useSeoMeta'
import { useTenantStore } from '../../store/tenant'

// 薄壳页面：onShow 递增 refreshTick 驱动刷新（首载由包内视图 immediate 完成）
useTenantTitle()

// 页面级 SEO：课程列表为薄壳页，实体数据在包内视图，页面层只按租户名出标题/描述/自指 canonical
const { state: tenantState } = useTenantStore()
useSeoMeta(() => ({
  title: tenantState.tenant?.name
    ? `课程中心 - ${tenantState.tenant.name}`
    : '课程中心 - 在线课程学习平台',
  description: '精选在线课程，覆盖多种学习主题，支持随时随地上课学习。',
  canonicalPath: '/h5/pages/course/index',
}))

const tick = ref(0)
onShow(() => {
  tick.value++
})
</script>
