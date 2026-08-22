<template>
  <ShopDetailView :product-id="id" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ShopDetailView } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useSeoMeta } from '../../composables/useSeoMeta'
import { useTenantStore } from '../../store/tenant'

// 薄壳页面：页面生命周期解析参数，整页视图来自 @scrm/h5-commerce
useTenantTitle()

const id = ref(0)

// 页面级 SEO：商品实体数据在包内视图，页面层按租户名出标题/描述，canonical 带 id 自指
const { state: tenantState } = useTenantStore()
useSeoMeta(() => ({
  title: tenantState.tenant?.name ? `商品详情 - ${tenantState.tenant.name}` : '商品详情',
  description: '商品详情：商品介绍、规格参数与购买入口，支持在线下单与配送服务。',
  canonicalPath: id.value ? `/h5/pages/shop/detail?id=${id.value}` : undefined,
}))
onLoad((options) => {
  id.value = Number(options?.id || 0)
})
</script>
