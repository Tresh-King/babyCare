<template>
  <view v-if="tips && tips.length > 0" class="premium-tips-card">
    <view class="tips-header">
      <view class="header-main">
        <view class="ai-sparkle">
          <image
            src="/static/smart_toy.svg"
            mode="aspectFit"
            class="sparkle-icon"
          />
        </view>
        <view class="title-group">
          <text class="title">智护建议</text>
          <text class="subtitle">AI为您定制的科学养育锦囊</text>
        </view>
      </view>
    </view>

    <view class="tips-masonry">
      <view
        v-for="(tip, index) in displayTips"
        :key="index"
        class="tip-brick premium-shadow"
        :class="['prio-' + tip.priority]"
        @click="handleTipClick(tip)"
      >
        <view class="brick-header">
          <view class="prio-dot"></view>
          <text class="brick-top-text">{{ tip.type }}</text>
        </view>
        <text class="brick-title">{{ tip.title }}</text>
        <text class="brick-desc">{{ tip.description }}</text>
        <view class="brick-footer">
          <text class="read-more">点击详情</text>
          <wd-icon name="arrow-right" size="12" />
        </view>
      </view>
    </view>
  </view>

  <!-- 空状态 -->
  <view v-else class="empty-glass-tips">
    <view class="glass-orb"></view>
    <text class="empty-text">AI正在分析宝宝状态...</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface DailyTip {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: "high" | "medium" | "low";
}

interface Props {
  tips?: DailyTip[];
  maxDisplay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  tips: () => [],
  maxDisplay: 3,
});

const emit = defineEmits<{
  tipClick: [tip: DailyTip];
}>();

const displayTips = computed(() => {
  if (!props.tips) return [];
  return props.tips.slice(0, props.maxDisplay);
});

const handleTipClick = (tip: DailyTip) => {
  emit("tipClick", tip);
};
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.premium-tips-card {
  padding: 12rpx 0;
}

.tips-header {
  margin-bottom: 24rpx;
  .header-main {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
  .ai-sparkle {
    width: 64rpx;
    height: 64rpx;
    background: linear-gradient(135deg, $color-primary-light 0%, #fff 100%);
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 12rpx rgba(123, 211, 162, 0.2);
    .sparkle-icon {
      width: 44rpx;
      height: 44rpx;
    }
  }
  .title-group {
    display: flex;
    flex-direction: column;
    .title {
      font-size: 30rpx;
      font-weight: 800;
      color: $color-text-primary;
    }
    .subtitle {
      font-size: 22rpx;
      color: $color-text-tertiary;
      margin-top: 2rpx;
    }
  }
}

.tips-masonry {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.tip-brick {
  background: #fff;
  border-radius: $radius-md;
  padding: 32rpx;
  border: 1px solid $color-border-light;
  transition: all 0.3s;

  &:active {
    transform: scale(0.98);
    background: $color-bg-secondary;
  }

  .brick-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 12rpx;
    .prio-dot {
      width: 12rpx;
      height: 12rpx;
      border-radius: 50%;
      background: $color-primary;
    }
    .brick-top-text {
      font-size: 20rpx;
      font-weight: 700;
      color: $color-text-tertiary;
      text-transform: uppercase;
    }
  }

  &.prio-high .prio-dot {
    background: $color-danger;
  }
  &.prio-medium .prio-dot {
    background: $color-warning;
  }

  .brick-title {
    font-size: 28rpx;
    font-weight: 700;
    color: $color-text-primary;
    margin-bottom: 8rpx;
    display: block;
  }

  .brick-desc {
    font-size: 24rpx;
    color: $color-text-secondary;
    line-height: 1.6;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .brick-footer {
    margin-top: 20rpx;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4rpx;
    .read-more {
      font-size: 22rpx;
      font-weight: 600;
      color: $color-primary;
    }
    :deep(.wd-icon) {
      color: $color-primary;
    }
  }
}

.empty-glass-tips {
  padding: 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  .glass-orb {
    width: 60rpx;
    height: 60rpx;
    background: linear-gradient(
      135deg,
      rgba(123, 211, 162, 0.4),
      rgba(123, 211, 162, 0.1)
    );
    border-radius: 50%;
    filter: blur(10rpx);
    animation: pulse 2s infinite;
  }
  .empty-text {
    font-size: 24rpx;
    color: $color-text-tertiary;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
}
</style>
