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
  horizontal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({}),
  height: '300px',
  horizontal: false
})

const mergedOptions = computed<EChartsOption>(() => {
  const categories = props.data.map(item => item.name)
  const values = props.data.map(item => item.value)

  const baseOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: props.horizontal
      ? { type: 'value' }
      : { type: 'category', data: categories },
    yAxis: props.horizontal
      ? { type: 'category', data: categories }
      : { type: 'value' },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: { borderRadius: props.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] }
    }]
  }

  return { ...baseOption, ...props.options }
})
</script>
