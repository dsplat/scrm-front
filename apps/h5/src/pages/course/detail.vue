<template>
  <CourseDetailView :course-id="id" :refresh-tick="tick" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { CourseDetailView } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'

// 薄壳页面：onLoad 解析参数；onShow 递增 refreshTick 驱动加载（支付返回后刷新）
useTenantTitle()

const id = ref(0)
const tick = ref(0)
onLoad((options) => {
  id.value = Number(options?.id || 0)
})
onShow(() => {
  tick.value++
})
</script>
