<template>
  <view class="sleep-container">
    <wd-navbar
      title="睡眠记录"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      @click-left="goBack"
    />

    <scroll-view class="sleep-scroll" scroll-y>
      <view class="sleep-content">
        <!-- 核心状态显示 (Orb Design) -->
        <view class="status-orb-card premium-shadow">
          <view class="orb-pulsar" :class="{ sleeping: ongoingRecord }"></view>
          <view class="orb-content">
            <view class="icon-box">
              <text class="emoji">{{ ongoingRecord ? "💤" : "👀" }}</text>
            </view>
            <view class="timer-box">
              <text v-if="ongoingRecord" class="timer-val">{{
                formattedTime
              }}</text>
              <text v-else class="timer-val idle">00:00:00</text>
              <text class="status-label">{{
                ongoingRecord ? "宝宝正在美梦中..." : "宝宝醒着呢"
              }}</text>
            </view>
          </view>
        </view>

        <!-- 睡眠类型 (Only when idle) -->
        <view v-if="!ongoingRecord" class="type-selection-row">
          <view
            class="type-pill"
            :class="{ active: sleepType === 'nap' }"
            @click="sleepType = 'nap'"
          >
            <wd-icon name="cloudy" size="18" />
            <text>小睡</text>
          </view>
          <view
            class="type-pill"
            :class="{ active: sleepType === 'night' }"
            @click="sleepType = 'night'"
          >
            <wd-icon name="moon" size="18" />
            <text>晚间睡眠</text>
          </view>
        </view>

        <!-- 核心操作按钮 -->
        <view class="main-action-area">
          <wd-button
            v-if="!ongoingRecord"
            block
            round
            type="primary"
            size="large"
            class="action-btn"
            @click="startSleep"
          >
            <wd-icon name="play-circle" size="24" />
            <text>开始计睡</text>
          </wd-button>

          <wd-button
            v-else
            block
            round
            type="success"
            size="large"
            class="action-btn"
            @click="endSleep"
          >
            <wd-icon name="check-circle" size="24" />
            <text>宝宝醒了</text>
          </wd-button>
        </view>

        <!-- 历史补记区域 -->
        <view v-if="!ongoingRecord" class="history-quick-card premium-shadow">
          <view class="card-header">
            <text class="title">补记之前的睡眠</text>
            <wd-icon name="info-circle" size="14" color="#94A3B8" />
          </view>
          <wd-button
            block
            plain
            round
            type="info"
            @click="showQuickRecordModal = true"
          >
            <wd-icon name="add" size="16" />
            <text>补记历史记录</text>
          </wd-button>
        </view>

        <!-- 上次睡眠摘要 -->
        <view v-if="lastRecord && !ongoingRecord" class="last-summary-card">
          <text class="summary-label"
            >上次睡眠：{{ formatRecordTime(lastRecord) }}</text
          >
          <text class="summary-val">{{
            formatDuration(lastRecord.duration || 0)
          }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 补记弹窗 (Redesigned) -->
    <wd-popup
      v-model="showQuickRecordModal"
      position="bottom"
      round
      safe-area-inset-bottom
    >
      <view class="premium-popup-content">
        <view class="popup-header">
          <text class="popup-title">补记睡眠记录</text>
          <wd-icon
            name="close"
            size="24"
            @click="showQuickRecordModal = false"
          />
        </view>

        <view class="form-body">
          <view class="form-item-premium">
            <text class="label">睡眠类型</text>
            <view class="pill-selector">
              <view
                class="pill"
                :class="{ active: quickRecord.type === 'nap' }"
                @click="quickRecord.type = 'nap'"
                >小睡</view
              >
              <view
                class="pill"
                :class="{ active: quickRecord.type === 'night' }"
                @click="quickRecord.type = 'night'"
                >晚间</view
              >
            </view>
          </view>

          <view class="form-item-premium">
            <text class="label">入睡时间</text>
            <wd-datetime-picker
              v-model="quickRecord.startTime"
              type="datetime"
              no-border
            />
          </view>

          <view class="form-item-premium">
            <text class="label">苏醒时间</text>
            <wd-datetime-picker
              v-model="quickRecord.endTime"
              type="datetime"
              no-border
            />
          </view>
        </view>

        <view class="popup-footer">
          <wd-button
            block
            round
            type="primary"
            size="large"
            @click="handleQuickSleepConfirm"
            >确认补记</wd-button
          >
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { currentBabyId, currentBaby } from "@/store/baby";
import { getUserInfo } from "@/store/user";
import { formatDate, formatDuration } from "@/utils/date";
import { goBack, padZero } from "@/utils/common";
import {
  StorageKeys,
  getStorage,
  setStorage,
  removeStorage,
} from "@/utils/storage";
import type { SleepRecord } from "@/types";
import * as sleepApi from "@/api/sleep";

const sleepType = ref<"nap" | "night">("nap");
const ongoingRecord = ref<SleepRecord | null>(null);
const lastRecord = ref<SleepRecord | null>(null);
const showQuickRecordModal = ref(false);
const quickRecord = ref({
  type: "nap" as any,
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
});

const startTime = ref(0);
const timerRunning = ref(false);
const timerTrigger = ref(0);
let timerInterval: any = null;

const formattedTime = computed(() => {
  void timerTrigger.value;
  if (!timerRunning.value || startTime.value === 0) return "00:00:00";
  const sec = Math.floor((Date.now() - startTime.value) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${padZero(h)}:${padZero(m)}:${padZero(s)}`;
});

const startSleep = () => {
  startTime.value = Date.now();
  timerRunning.value = true;
  ongoingRecord.value = {
    startTime: startTime.value,
    type: sleepType.value,
  } as any;
  setStorage(StorageKeys.TEMP_SLEEP_RECORDING, {
    babyId: currentBabyId.value,
    type: sleepType.value,
    startTime: startTime.value,
  });
  timerInterval = setInterval(() => timerTrigger.value++, 1000);
};

const endSleep = async () => {
  if (timerInterval) clearInterval(timerInterval);
  timerRunning.value = false;
  try {
    const dur = Math.floor((Date.now() - startTime.value) / 1000);
    await sleepApi.apiCreateSleepRecord({
      babyId: currentBabyId.value,
      sleepType: sleepType.value,
      startTime: startTime.value,
      endTime: Date.now(),
      duration: dur,
    });
    removeStorage(StorageKeys.TEMP_SLEEP_RECORDING);
    ongoingRecord.value = null;
    uni.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) {}
};

const handleQuickSleepConfirm = async () => {
  if (quickRecord.value.startTime >= quickRecord.value.endTime) {
    uni.showToast({ title: "时间顺序错误", icon: "none" });
    return;
  }
  try {
    const dur = Math.floor(
      (quickRecord.value.endTime - quickRecord.value.startTime) / 1000,
    );
    await sleepApi.apiCreateSleepRecord({
      babyId: currentBabyId.value,
      sleepType: quickRecord.value.type,
      startTime: quickRecord.value.startTime,
      endTime: quickRecord.value.endTime,
      duration: dur,
    });
    showQuickRecordModal.value = false;
    uni.showToast({ title: "已补记", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) {}
};

onMounted(() => {
  const temp = getStorage<any>(StorageKeys.TEMP_SLEEP_RECORDING);
  if (temp && temp.babyId === currentBabyId.value) {
    startTime.value = temp.startTime;
    sleepType.value = temp.type;
    timerRunning.value = true;
    ongoingRecord.value = { startTime: temp.startTime, type: temp.type } as any;
    timerInterval = setInterval(() => timerTrigger.value++, 1000);
  }
});

const formatRecordTime = (r: SleepRecord) =>
  formatDate(r.startTime, "MM-DD HH:mm");
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.sleep-container {
  min-height: 100vh;
  background: $color-bg-secondary;
}

.sleep-scroll {
  height: calc(100vh - 160rpx);
}

.sleep-content {
  padding: 48rpx 32rpx;
}

.status-orb-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  margin-bottom: 48rpx;

  .orb-pulsar {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300rpx;
    height: 300rpx;
    background: $color-primary-lighter;
    border-radius: 50%;
    filter: blur(40rpx);
    opacity: 0.3;
    &.sleeping {
      animation: breath 4s infinite;
      background: #ebf4ff;
    }
  }

  .orb-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32rpx;
  }

  .icon-box {
    width: 140rpx;
    height: 140rpx;
    background: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
    .emoji {
      font-size: 64rpx;
    }
  }

  .timer-box {
    text-align: center;
    .timer-val {
      font-size: 80rpx;
      font-weight: 800;
      color: $color-text-primary;
      font-family: "Outfit";
      display: block;
    }
    .timer-val.idle {
      color: $color-text-tertiary;
      opacity: 0.5;
    }
    .status-label {
      font-size: 24rpx;
      font-weight: 700;
      color: $color-text-tertiary;
      margin-top: 12rpx;
      display: block;
    }
  }
}

@keyframes breath {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.2;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.4;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.2;
  }
}

.type-selection-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 48rpx;
  .type-pill {
    flex: 1;
    height: 100rpx;
    background: #fff;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    border: 1px solid $color-border-light;
    transition: all 0.3s;
    text {
      font-size: 26rpx;
      font-weight: 700;
      color: $color-text-secondary;
    }
    &.active {
      background: $color-primary-lighter;
      border-color: $color-primary;
      text {
        color: $color-primary-dark;
      }
      :deep(.wd-icon) {
        color: $color-primary-dark;
      }
    }
  }
}

.main-action-area {
  margin-bottom: 60rpx;
  .action-btn {
    box-shadow: 0 12rpx 32rpx rgba(123, 211, 162, 0.3);
  }
}

.history-quick-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 40rpx;
  margin-bottom: 40rpx;
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    .title {
      font-size: 26rpx;
      font-weight: 700;
      color: $color-text-primary;
    }
  }
}

.last-summary-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12rpx;
  .summary-label {
    font-size: 24rpx;
    color: $color-text-tertiary;
    font-weight: 500;
  }
  .summary-val {
    font-size: 24rpx;
    font-weight: 800;
    color: $color-text-primary;
  }
}

.premium-popup-content {
  padding: 40rpx;
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 48rpx;
    .popup-title {
      font-size: 34rpx;
      font-weight: 800;
    }
  }
}

.pill-selector {
  display: flex;
  gap: 20rpx;
  .pill {
    flex: 1;
    height: 80rpx;
    background: $color-bg-secondary;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    font-weight: 700;
    color: $color-text-tertiary;
    &.active {
      background: $color-primary;
      color: #fff;
    }
  }
}

.form-item-premium {
  margin-bottom: 40rpx;
  .label {
    font-size: 22rpx;
    font-weight: 800;
    color: $color-text-tertiary;
    margin-bottom: 12rpx;
    display: block;
  }
}

.safe-bottom-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40rpx;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}
</style>
