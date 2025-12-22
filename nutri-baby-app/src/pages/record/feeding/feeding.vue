<template>
  <view class="feeding-container">
    <wd-navbar
      title="喂养记录"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      @click-left="goBack"
    />

    <scroll-view class="feeding-scroll" scroll-y>
      <view class="feeding-content">
        <!-- 喂养类型切换 (Premium Tabs) -->
        <view class="type-selector premium-shadow">
          <view
            v-for="type in feedingTypes"
            :key="type.value"
            class="type-pill"
            :class="{ active: feedingType === type.value }"
            @click="feedingType = type.value as any"
          >
            <image :src="type.icon" mode="aspectFit" class="pill-icon" />
            <text>{{ type.label }}</text>
          </view>
        </view>

        <!-- 母乳计时器大卡片 -->
        <view
          v-if="feedingType === 'breast'"
          class="timer-section premium-shadow"
        >
          <view class="timer-orb" :class="{ pulses: timerRunning }">
            <view class="orb-inner">
              <text class="time-display">{{ formattedTime }}</text>
              <text class="status-txt">{{
                timerRunning ? "正在计时..." : "准备就绪"
              }}</text>
            </view>
          </view>

          <view class="side-selector">
            <view
              v-for="s in breastSides"
              :key="s.value"
              class="side-chip"
              :class="{ active: breastForm.side === s.value }"
              @click="breastForm.side = s.value as any"
            >
              {{ s.label }}
            </view>
          </view>

          <view class="timer-actions">
            <wd-button
              v-if="!timerRunning"
              block
              round
              type="primary"
              size="large"
              @click="startTimer"
            >
              <wd-icon name="play-circle" size="20" />
              <text>立即开始</text>
            </wd-button>
            <wd-button
              v-else
              block
              round
              type="success"
              size="large"
              @click="stopTimer"
            >
              <wd-icon name="stop-circle" size="20" />
              <text>结束计时</text>
            </wd-button>
          </view>
        </view>

        <!-- 表单输入区 -->
        <view class="form-card premium-shadow">
          <!-- 补录时长 (仅母乳) -->
          <template v-if="feedingType === 'breast'">
            <view
              v-if="breastForm.side === 'left' || breastForm.side === 'both'"
              class="form-item-premium"
            >
              <text class="label">左侧时长 (min)</text>
              <wd-input-number
                v-model="leftDurationMinutes"
                :min="0"
                :step="0.5"
              />
            </view>
            <view v-if="breastForm.side === 'both'" class="form-divider"></view>
            <view
              v-if="breastForm.side === 'right' || breastForm.side === 'both'"
              class="form-item-premium"
            >
              <text class="label">右侧时长 (min)</text>
              <wd-input-number
                v-model="rightDurationMinutes"
                :min="0"
                :step="0.5"
              />
            </view>
          </template>

          <!-- 奶瓶表单 -->
          <template v-if="feedingType === 'bottle'">
            <view class="form-item-premium">
              <text class="label">奶液类型</text>
              <view class="chip-group">
                <view
                  v-for="bt in bottleTypes"
                  :key="bt.value"
                  class="side-chip"
                  :class="{ active: bottleForm.bottleType === bt.value }"
                  @click="bottleForm.bottleType = bt.value as any"
                  >{{ bt.label }}</view
                >
              </view>
            </view>
            <view class="form-divider"></view>
            <view class="form-item-premium">
              <text class="label">喂养量 ({{ bottleForm.unit }})</text>
              <wd-input-number
                v-model="bottleForm.amount"
                :min="0"
                :step="10"
              />
            </view>
          </template>

          <!-- 辅食表单 -->
          <template v-if="feedingType === 'food'">
            <view class="form-item-premium">
              <text class="label">辅食名称</text>
              <wd-input
                v-model="foodForm.foodName"
                placeholder="如：胡萝卜泥"
                no-border
              />
            </view>
          </template>

          <view class="form-divider"></view>

          <!-- 通用字段 -->
          <view class="form-item-premium">
            <text class="label">记录时间</text>
            <wd-datetime-picker
              v-model="recordDateTime"
              type="datetime"
              no-border
            />
          </view>

          <view class="form-divider"></view>

          <view class="form-item-premium">
            <text class="label">备注 / 心情</text>
            <wd-textarea
              v-model="foodForm.note"
              placeholder="记录宝宝的反应..."
              auto-height
            />
          </view>
        </view>

        <!-- 提醒设置 -->
        <view class="reminder-card premium-shadow">
          <view class="rn-header">
            <view class="l">
              <wd-icon name="bell" size="18" color="#7BD3A2" />
              <text>下次喂养提醒</text>
            </view>
            <wd-switch v-model="reminderEnabled" />
          </view>
          <view v-if="reminderEnabled" class="rn-body">
            <view class="interval-row">
              <view
                v-for="opt in quickReminderOptions"
                :key="opt.value"
                class="side-chip small"
                :class="{ active: reminderInterval === opt.value }"
                @click="reminderInterval = opt.value"
                >{{ opt.label }}</view
              >
            </view>
            <view class="next-time">
              预计提醒：<text class="green">{{
                formatRecordTime(nextReminderTime)
              }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="safe-bottom-dock">
      <wd-button block round type="primary" size="large" @click="handleSubmit">
        {{ isEditing ? "确认更新" : "确认并保存" }}
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { currentBaby, currentBabyId } from "@/store/baby";
import { getUserInfo } from "@/store/user";
import {
  StorageKeys,
  getStorage,
  removeStorage,
  setStorage,
} from "@/utils/storage";
import { goBack } from "@/utils/common";
import * as feedingApi from "@/api/feeding";

const feedingTypes = [
  { label: "母乳", value: "breast", icon: "/static/breastfeeding.svg" },
  { label: "奶瓶", value: "bottle", icon: "/static/bottle.svg" },
  { label: "辅食", value: "food", icon: "/static/food.svg" },
];

const breastSides = [
  { label: "左侧", value: "left" },
  { label: "右侧", value: "right" },
  { label: "两侧", value: "both" },
];

const bottleTypes = [
  { label: "配方奶", value: "formula" },
  { label: "母乳", value: "breast-milk" },
];

const editId = ref("");
const isEditing = computed(() => !!editId.value);
const feedingType = ref<"breast" | "bottle" | "food">("breast");

const breastForm = ref({
  side: "left" as any,
  leftDuration: 0,
  rightDuration: 0,
});
const bottleForm = ref({
  bottleType: "formula" as any,
  amount: 60,
  unit: "ml",
  remaining: 0,
});
const foodForm = ref({ foodName: "", note: "" });

// Timer Logic
const startTime = ref(0);
const timerRunning = ref(false);
const elapsedSeconds = ref(0);
let timerInterval: any = null;

const formattedTime = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60);
  const s = elapsedSeconds.value % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

const leftDurationMinutes = computed({
  get: () => Number((breastForm.value.leftDuration / 60).toFixed(1)),
  set: (v) => (breastForm.value.leftDuration = Math.round(v * 60)),
});

const rightDurationMinutes = computed({
  get: () => Number((breastForm.value.rightDuration / 60).toFixed(1)),
  set: (v) => (breastForm.value.rightDuration = Math.round(v * 60)),
});

const startTimer = () => {
  startTime.value = Date.now();
  timerRunning.value = true;
  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000);
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
  timerRunning.value = false;
  const total = elapsedSeconds.value;
  if (breastForm.value.side === "both") {
    breastForm.value.leftDuration = Math.floor(total / 2);
    breastForm.value.rightDuration = total - breastForm.value.leftDuration;
  } else if (breastForm.value.side === "left") {
    breastForm.value.leftDuration = total;
    breastForm.value.rightDuration = 0;
  } else {
    breastForm.value.leftDuration = 0;
    breastForm.value.rightDuration = total;
  }
};

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

// Reminder Logic
const recordDateTime = ref(Date.now());
const reminderEnabled = ref(true);
const reminderInterval = ref(180);
const nextReminderTime = computed(
  () => recordDateTime.value + reminderInterval.value * 60 * 1000,
);
const quickReminderOptions = [
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "4h", value: 240 },
];

const formatRecordTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

onLoad((opt) => {
  if (opt?.editId) {
    editId.value = opt.editId;
  }
});

const handleSubmit = async () => {
  if (timerRunning.value) stopTimer();
  if (!currentBaby.value) return;
  try {
    const detail: any = { type: feedingType.value };
    if (feedingType.value === "breast") {
      detail.side = breastForm.value.side;
      detail.leftDuration = breastForm.value.leftDuration;
      detail.rightDuration = breastForm.value.rightDuration;
    } else if (feedingType.value === "bottle") {
      Object.assign(detail, bottleForm.value);
    } else {
      Object.assign(detail, foodForm.value);
    }

    const payload = {
      babyId: currentBaby.value.babyId,
      feedingType: feedingType.value,
      feedingTime: recordDateTime.value,
      amount:
        feedingType.value === "bottle" ? bottleForm.value.amount : undefined,
      duration:
        feedingType.value === "breast"
          ? breastForm.value.leftDuration + breastForm.value.rightDuration
          : undefined,
      detail,
      note: foodForm.value.note,
    };

    if (isEditing.value) {
      await feedingApi.apiUpdateFeedingRecord(editId.value, payload);
      uni.showToast({ title: "已更新", icon: "success" });
    } else {
      await feedingApi.apiCreateFeedingRecord(payload);
      uni.showToast({ title: "已保存", icon: "success" });
    }
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) {}
};
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.feeding-container {
  min-height: 100vh;
  background: $color-bg-secondary;
}

.feeding-scroll {
  height: calc(100vh - 160rpx);
}

.feeding-content {
  padding: 32rpx;
}

.type-selector {
  background: #fff;
  border-radius: $radius-lg;
  padding: 12rpx;
  display: flex;
  margin-bottom: 40rpx;

  .type-pill {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    padding: 24rpx 0;
    border-radius: $radius-md;
    transition: all 0.3s;

    .pill-icon {
      width: 48rpx;
      height: 48rpx;
      opacity: 0.5;
    }
    text {
      font-size: 24rpx;
      font-weight: 700;
      color: $color-text-tertiary;
    }

    &.active {
      background: $color-primary-lighter;
      .pill-icon {
        opacity: 1;
      }
      text {
        color: $color-primary-dark;
      }
    }
  }
}

.timer-section {
  background: #fff;
  border-radius: $radius-lg;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;

  .timer-orb {
    width: 320rpx;
    height: 320rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, $color-primary-lighter 0%, #fff 100%);
    border: 12rpx solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12rpx 40rpx rgba(123, 211, 162, 0.2);
    margin-bottom: 48rpx;

    &.pulses {
      animation: pulseOrb 2s infinite;
    }

    .orb-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      .time-display {
        font-size: 72rpx;
        font-weight: 800;
        color: $color-primary-dark;
        font-family: "Outfit";
      }
      .status-txt {
        font-size: 22rpx;
        font-weight: 700;
        color: $color-text-tertiary;
        margin-top: 8rpx;
      }
    }
  }
}

@keyframes pulseOrb {
  0% {
    box-shadow: 0 0 0 0 rgba(123, 211, 162, 0.4);
  }
  70% {
    box-shadow: 0 0 0 40rpx rgba(123, 211, 162, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(123, 211, 162, 0);
  }
}

.side-selector {
  display: flex;
  gap: 20rpx;
  margin-bottom: 48rpx;
}

.side-chip {
  padding: 16rpx 40rpx;
  background: $color-bg-secondary;
  border-radius: 100rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: $color-text-secondary;
  &.active {
    background: $color-primary;
    color: #fff;
  }
  &.small {
    padding: 12rpx 32rpx;
    font-size: 22rpx;
  }
}

.form-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24rpx 40rpx;
  margin-bottom: 40rpx;
}

.form-item-premium {
  padding: 32rpx 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .label {
    font-size: 26rpx;
    font-weight: 800;
    color: $color-text-secondary;
  }
  .chip-group {
    display: flex;
    gap: 12rpx;
  }
}

.form-divider {
  height: 1rpx;
  background: $color-divider;
}

.reminder-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 40rpx;
  .rn-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .l {
      display: flex;
      align-items: center;
      gap: 12rpx;
      text {
        font-size: 28rpx;
        font-weight: 700;
      }
    }
  }
  .rn-body {
    margin-top: 32rpx;
    .interval-row {
      display: flex;
      gap: 12rpx;
      margin-bottom: 24rpx;
    }
    .next-time {
      font-size: 24rpx;
      color: $color-text-tertiary;
      .green {
        color: $color-primary;
        font-weight: 800;
      }
    }
  }
}

.safe-bottom-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40rpx 48rpx calc(40rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}
</style>
