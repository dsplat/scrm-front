<template>
  <CourseDetailView :course-id="id" :refresh-tick="tick" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { CourseDetailView } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useSeoMeta } from '../../composables/useSeoMeta'
import { useTenantStore } from '../../store/tenant'

// 薄壳页面：onLoad 解析参数；onShow 递增 refreshTick 驱动刷新（支付返回后；首载由包内视图 immediate 完成）
useTenantTitle()

const id = ref(0)

// 页面级 SEO：课程实体数据在包内视图，页面层按租户名出标题/描述，canonical 带 id 自指
const { state: tenantState } = useTenantStore()
useSeoMeta(() => ({
  title: tenantState.tenant?.name ? `课程详情 - ${tenantState.tenant.name}` : '课程详情',
  description: '课程详情：课程介绍、章节目录与学习入口，支持在线学习与购买。',
  canonicalPath: id.value ? `/h5/pages/course/detail?id=${id.value}` : undefined,
}))
const tick = ref(0)
onLoad((options) => {
  id.value = Number(options?.id || 0)
})
onShow(() => {
  tick.value++
})
</script>
