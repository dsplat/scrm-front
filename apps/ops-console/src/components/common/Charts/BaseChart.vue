<template>
  <div class="base-chart">
    <div v-if="!hasData" class="chart-empty">
      <el-empty description="暂无数据" :image-size="80" />
    </div>
    <div v-else ref="chartRef" class="chart-canvas" :style="{ height: height }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

interface Props {
  data?: any[]
  options?: echarts.EChartsOption
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  options: () => ({}),
  height: '300px'
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const hasData = computed(() => {
  if (!props.data || props.data.length === 0) return false
  return props.data.some(item => {
    if (typeof item === 'object' && item !== null) {
      return item.value !== undefined && item.value !== null
    }
    return item !== undefined && item !== null
  })
})

function initChart() {
  if (!chartRef.value || !hasData.value) return
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chartInstance || !hasData.value) return
  chartInstance.setOption(props.options, true)
}

function handleResize() {
  chartInstance?.resize()
}

watch(() => props.options, () => {
  nextTick(updateChart)
}, { deep: true })

watch(() => props.data, () => {
  nextTick(() => {
    if (hasData.value && !chartInstance) {
      initChart()
    } else {
      updateChart()
    }
  })
}, { deep: true })

onMounted(async () => {
  await nextTick()
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped lang="scss">
.base-chart {
  width: 100%;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.chart-canvas {
  width: 100%;
}
</style>
