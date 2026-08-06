<template>
  <ShopListView title="商城" />
</template>

<script setup lang="ts">
import { ShopListView } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'

// 薄壳页面：整页视图来自 @scrm/h5-commerce，页面注册（pages.json）不变
useTenantTitle()
</script>
