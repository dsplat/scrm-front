<template>
  <ShopDetailView :product-id="id" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ShopDetailView } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'

// 薄壳页面：页面生命周期解析参数，整页视图来自 @scrm/h5-commerce
useTenantTitle()

const id = ref(0)
onLoad((options) => {
  id.value = Number(options?.id || 0)
})
</script>
