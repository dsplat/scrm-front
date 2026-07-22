<template>
  <view class="evaluate-page">
    <NavBar title="活动评价" />
    <view class="rating-section">
      <view class="rating-item">
        <text class="label"> 总体评价 </text>
        <view class="stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ active: form.overall_score >= i }"
            @tap="form.overall_score = i"
          >
            ★
          </text>
        </view>
      </view>
      <view class="rating-item">
        <text class="label"> 活动内容 </text>
        <view class="stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ active: form.content_score >= i }"
            @tap="form.content_score = i"
          >
            ★
          </text>
        </view>
      </view>
      <view class="rating-item">
        <text class="label"> 场地环境 </text>
        <view class="stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ active: form.venue_score >= i }"
            @tap="form.venue_score = i"
          >
            ★
          </text>
        </view>
      </view>
      <view class="rating-item">
        <text class="label"> 服务质量 </text>
        <view class="stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ active: form.service_score >= i }"
            @tap="form.service_score = i"
          >
            ★
          </text>
        </view>
      </view>
    </view>
    <!-- 标签选择 -->
    <view class="tags-section">
      <text class="section-title"> 选择标签 </text>
      <view class="tags-wrap">
        <text
          v-for="tag in presetTags"
          :key="tag"
          class="tag"
          :class="{ selected: form.tags.includes(tag) }"
          @tap="toggleTag(tag)"
        >
          {{ tag }}
        </text>
      </view>
    </view>
    <!-- 文字评价 -->
    <view class="comment-section">
      <text class="section-title"> 文字评价 </text>
      <textarea
        v-model="form.comment"
        class="comment-input"
        placeholder="分享你的活动体验..."
        maxlength="500"
      />
    </view>
    <button class="submit-btn" :loading="submitting" @tap="handleSubmit">提交评价</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { submitEvaluation } from '../../api/event'
import NavBar from '../../components/NavBar.vue'

const presetTags = [
  '内容丰富',
  '老师专业',
  '孩子喜欢',
  '场地好',
  '组织有序',
  '性价比高',
  '互动性强',
  '收获满满',
]

const form = reactive({
  overall_score: 5,
  content_score: 5,
  venue_score: 5,
  service_score: 5,
  comment: '',
  tags: [] as string[],
})

const submitting = ref(false)
let eventId = ''

function toggleTag(tag: string) {
  const idx = form.tags.indexOf(tag)
  if (idx >= 0) {
    form.tags.splice(idx, 1)
  } else {
    form.tags.push(tag)
  }
}

async function handleSubmit() {
  submitting.value = true
  try {
    await submitEvaluation(eventId, { ...form })
    uni.showToast({ title: '评价成功，感谢参与！', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

const pages = getCurrentPages()
const page = pages[pages.length - 1] as any
eventId = page?.$page?.options?.eventId || page?.options?.eventId || ''
</script>

<style scoped>
.rating-section {
  padding: 32rpx;
}
.rating-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}
.rating-item .label {
  font-size: 30rpx;
}
.stars {
  display: flex;
}
.star {
  font-size: 44rpx;
  color: #ddd;
  margin-left: 8rpx;
}
.star.active {
  color: #f1c40f;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 16rpx;
}
.tags-section {
  padding: 0 32rpx 24rpx;
}
.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag {
  padding: 12rpx 24rpx;
  border: 2rpx solid #eee;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #666;
}
.tag.selected {
  border-color: #4a90d9;
  color: #4a90d9;
  background: #f0f7ff;
}
.comment-section {
  padding: 0 32rpx;
}
.comment-input {
  width: 100%;
  height: 200rpx;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.submit-btn {
  margin: 32rpx;
  background: #4a90d9;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
}
</style>
