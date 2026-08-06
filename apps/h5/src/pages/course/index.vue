<template>
  <CourseListView :refresh-tick="tick" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CourseListView } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'

// 薄壳页面：onShow 递增 refreshTick 驱动包内视图加载/刷新
useTenantTitle()

const tick = ref(0)
onShow(() => {
  tick.value++
})
</script>
