<template>
  <!-- AI 生成内容合规标识：必须与生成内容同屏可见，提审首屏即要能看到 -->
  <text class="ai-generated-notice">
    {{ AI_GENERATED_NOTICE }}
  </text>
</template>

<script setup lang="ts">
import { AI_GENERATED_NOTICE } from './ai-generated-notice'
</script>

<style scoped>
.ai-generated-notice {
  display: block;
  padding-top: 8rpx;
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 22rpx;
  line-height: 1.5;
  text-align: center;
}
</style>
