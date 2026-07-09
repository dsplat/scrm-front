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
  smooth?: boolean
  area?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({}),
  height: '300px',
  smooth: true,
  area: false
})

const mergedOptions = computed<EChartsOption>(() => {
  const categories = props.data.map(item => item.name)
  const values = props.data.map(item => item.value)

  const baseOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: categories, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [{
      type: 'line',
      data: values,
      smooth: props.smooth,
      areaStyle: props.area ? {} : undefined
    }]
  }

  return { ...baseOption, ...props.options }
})
</script>
