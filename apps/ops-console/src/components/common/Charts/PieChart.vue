<template>
  <BaseChart :data="data" :options="mergedOptions" :height="height" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from './BaseChart.vue'

interface Props {
  data: { name: string; value: number }[]
  options?: EChartsOption
  height?: string
  radius?: string | [string, string]
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({}),
  height: '300px',
  radius: '60%'
})

const mergedOptions = computed<EChartsOption>(() => {
  const baseOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%' },
    series: [{
      type: 'pie',
      radius: props.radius,
      data: props.data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }

  return { ...baseOption, ...props.options }
})
</script>
