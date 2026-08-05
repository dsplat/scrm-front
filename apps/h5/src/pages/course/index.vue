<template>
  <view class="course-page">
    <NavBar title="课程中心" />

    <!-- Tab -->
    <view class="filter-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @tap="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 课程广场 -->
    <template v-if="activeTab === 'plaza'">
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <view v-else-if="courses.length === 0" class="empty-tip">
        <text>暂无已发布课程</text>
      </view>
      <view
        v-for="item in courses"
        :key="item.course_id"
        class="course-card"
        @tap="goDetail(item.course_id)"
      >
        <image v-if="item.cover" class="course-cover" :src="item.cover" mode="aspectFill" />
        <view v-else class="course-cover placeholder">
          <text>{{ item.title.slice(0, 1) }}</text>
        </view>
        <view class="course-info">
          <text class="course-title">
            {{ item.title }}
          </text>
          <text v-if="item.description" class="course-desc">
            {{ item.description }}
          </text>
          <view class="course-price-row">
            <text v-if="Number(item.price) > 0" class="price">
              ¥{{ Number(item.price).toFixed(2) }}
            </text>
            <text v-else class="price free"> 免费 </text>
            <text v-if="Number(item.points_price) > 0" class="points-price">
              {{ item.points_price }}积分
            </text>
            <text v-if="Number(item.completion_reward_points) > 0" class="reward">
              学完奖{{ item.completion_reward_points }}积分
            </text>
          </view>
        </view>
      </view>
    </template>

    <!-- 我的课程 -->
    <template v-else>
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <view v-else-if="myCourses.length === 0" class="empty-tip">
        <text>还没有购买过课程</text>
      </view>
      <view
        v-for="item in myCourses"
        :key="item.course.course_id"
        class="course-card"
        @tap="goLearn(item.course.course_id)"
      >
        <image
          v-if="item.course.cover"
          class="course-cover"
          :src="item.course.cover"
          mode="aspectFill"
        />
        <view v-else class="course-cover placeholder">
          <text>{{ item.course.title.slice(0, 1) }}</text>
        </view>
        <view class="course-info">
          <text class="course-title">
            {{ item.course.title }}
          </text>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: `${item.progress}%` }" />
          </view>
          <text class="progress-text">
            {{ item.completed_at ? '已完成' : `学习进度 ${item.progress}%` }}
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getPublishedCourses,
  getMyCourses,
  type CourseVO,
  type MyCourseItem,
} from '../../api/course'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

useTenantTitle()

const tabs = [
  { label: '课程广场', value: 'plaza' },
  { label: '我的课程', value: 'mine' },
]

const activeTab = ref('plaza')
const loading = ref(false)
const courses = ref<CourseVO[]>([])
const myCourses = ref<MyCourseItem[]>([])

function switchTab(value: string) {
  activeTab.value = value
  load()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/course/detail?id=${id}` })
}

function goLearn(id: number) {
  uni.navigateTo({ url: `/pages/course/learn?id=${id}` })
}

async function load() {
  loading.value = true
  try {
    if (activeTab.value === 'plaza') {
      const res = await getPublishedCourses()
      courses.value = res.data || []
    } else {
      const res = await getMyCourses()
      myCourses.value = Array.isArray(res) ? res : []
    }
  } catch {
    courses.value = []
    myCourses.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
onShow(() => {
  // 购买/学习返回后刷新
  load()
})
</script>

<style scoped>
.course-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.filter-tabs {
  display: flex;
  padding: 0 24rpx;
  background: #fff;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}
.tab-item.active {
  color: #07c160;
  font-weight: 600;
  border-bottom-color: #07c160;
}
.loading-tip,
.empty-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
.course-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
}
.course-cover {
  width: 220rpx;
  height: 200rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}
.course-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  color: #ccc;
  background: linear-gradient(135deg, #e8f5ee 0%, #d6ecdd 100%);
}
.course-info {
  flex: 1;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
}
.course-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.course-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}
.course-price-row {
  margin-top: auto;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  flex-wrap: wrap;
}
.price {
  font-size: 32rpx;
  font-weight: 700;
  color: #e64340;
}
.price.free {
  color: #07c160;
}
.points-price {
  font-size: 24rpx;
  color: #ff9500;
}
.reward {
  font-size: 22rpx;
  color: #07c160;
}
.progress-bar {
  margin-top: 20rpx;
  height: 12rpx;
  background: #eee;
  border-radius: 6rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #07c160;
  border-radius: 6rpx;
}
.progress-text {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #888;
}
</style>
