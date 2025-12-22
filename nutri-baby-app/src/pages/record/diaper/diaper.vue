<template>
  <view class="diaper-container">
    <wd-navbar
      title="尿布记录"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      @click-left="goBack"
    />

    <scroll-view class="diaper-scroll" scroll-y>
      <view class="diaper-content">
        <!-- 核心类型选择 (Premium Cards) -->
        <view class="type-grid">
          <view
            v-for="t in types"
            :key="t.value"
            class="type-card premium-shadow"
            :class="{ active: form.type === t.value, [t.value]: true }"
            @click="form.type = t.value as any"
          >
            <view class="icon-orb">
              <text class="emoji">{{ t.emoji }}</text>
            </view>
            <text class="label">{{ t.label }}</text>
            <view class="check-box">
              <wd-icon name="check" size="12" color="#FFF" />
            </view>
          </view>
        </view>

        <!-- 详细观察区 (仅限有便便的情况) -->
        <view
          v-if="form.type !== 'pee'"
          class="poop-analysis-card premium-shadow"
        >
          <view class="section-title">
            <view class="dot"></view>
            <text>便便观察</text>
          </view>

          <view class="analysis-item">
            <text class="sub-label">颜色参考</text>
            <view class="color-chips">
              <view
                v-for="color in poopColors"
                :key="color.value"
                class="color-chip"
                :class="{ active: form.poopColor === color.value }"
                @click="form.poopColor = color.value as any"
              >
                <view
                  class="c-circle"
                  :style="{ background: color.color }"
                ></view>
                <text>{{ color.label }}</text>
              </view>
            </view>
          </view>

          <view class="form-divider"></view>

          <view class="analysis-item">
            <text class="sub-label">性状描述</text>
            <view class="texture-grid">
              <view
                v-for="txt in poopTextures"
                :key="txt.value"
                class="txt-pill"
                :class="{ active: form.poopTexture === txt.value }"
                @click="form.poopTexture = txt.value as any"
                >{{ txt.label }}</view
              >
            </view>
          </view>
        </view>

        <!-- 基础配置 -->
        <view class="form-card premium-shadow">
          <view class="form-item-premium">
            <text class="label">记录时间</text>
            <wd-datetime-picker
              v-model="recordDateTime"
              type="datetime"
              no-border
            />
          </view>
          <view class="form-divider"></view>
          <view class="form-item-premium stack">
            <text class="label">备注及异常</text>
            <wd-textarea
              v-model="form.note"
              placeholder="记录红屁屁、水分等异常情况..."
              auto-height
            />
          </view>
        </view>

        <view class="info-guide">
          <wd-icon name="info-circle" size="14" />
          <text>通过记录便便颜色和性状，可以帮助医生判断宝宝消化健康</text>
        </view>
      </view>
    </scroll-view>

    <view class="safe-bottom-dock">
      <wd-button block round type="primary" size="large" @click="handleSubmit">
        {{ isEditing ? "确认修改" : "确认并保存" }}
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { currentBaby, currentBabyId } from "@/store/baby";
import { getUserInfo } from "@/store/user";
import { goBack } from "@/utils/common";
import * as diaperApi from "@/api/diaper";

const types = [
  { label: "小便", value: "pee", emoji: "💧" },
  { label: "大便", value: "poop", emoji: "💩" },
  { label: "两者", value: "both", emoji: "✨" },
];

const poopColors = [
  { value: "yellow", label: "黄色", color: "#FFD700" },
  { value: "green", label: "绿色", color: "#90EE90" },
  { value: "brown", label: "棕色", color: "#8B4513" },
  { value: "black", label: "黑色", color: "#333333" },
  { value: "red", label: "红色", color: "#FF6347" },
  { value: "white", label: "灰白", color: "#F0F0F0" },
];

const poopTextures = [
  { value: "watery", label: "稀水" },
  { value: "loose", label: "稀软" },
  { value: "paste", label: "糊状" },
  { value: "soft", label: "软便" },
  { value: "formed", label: "成形" },
  { value: "hard", label: "硬结" },
];

const editId = ref("");
const isEditing = computed(() => !!editId.value);
const recordDateTime = ref(Date.now());
const form = ref({
  type: "pee" as any,
  poopColor: undefined as any,
  poopTexture: undefined as any,
  note: "",
});

onLoad((opt) => {
  if (opt?.editId) {
    editId.value = opt.editId;
    loadData(opt.editId);
  }
});

const loadData = async (id: string) => {
  try {
    const res = await diaperApi.apiGetDiaperRecordById(id);
    form.value = {
      type: res.diaperType,
      poopColor: res.pooColor,
      poopTexture: res.pooTexture,
      note: res.note || "",
    };
    recordDateTime.value = res.changeTime;
  } catch (e) {}
};

const handleSubmit = async () => {
  if (!currentBaby.value) return;
  try {
    const payload = {
      babyId: currentBaby.value.babyId,
      diaperType: form.value.type,
      pooColor: form.value.poopColor,
      pooTexture: form.value.poopTexture,
      note: form.value.note || undefined,
      changeTime: recordDateTime.value,
    };
    if (isEditing.value)
      await diaperApi.apiUpdateDiaperRecord(editId.value, payload);
    else await diaperApi.apiCreateDiaperRecord(payload);
    uni.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) {}
};
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.diaper-container {
  min-height: 100vh;
  background: $color-bg-secondary;
}

.diaper-scroll {
  height: calc(100vh - 160rpx);
}

.diaper-content {
  padding: 32rpx;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.type-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 32rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  position: relative;
  border: 4rpx solid transparent;
  transition: all 0.3s;

  .icon-orb {
    width: 80rpx;
    height: 80rpx;
    background: $color-bg-secondary;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    .emoji {
      font-size: 40rpx;
    }
  }

  .label {
    font-size: 26rpx;
    font-weight: 800;
    color: $color-text-secondary;
  }

  .check-box {
    position: absolute;
    top: 12rpx;
    right: 12rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: $color-divider;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: scale(0.8);
  }

  &.active {
    border-color: $color-primary;
    .icon-orb {
      background: $color-primary-lighter;
    }
    .label {
      color: $color-primary-dark;
    }
    .check-box {
      background: $color-primary;
      transform: scale(1);
    }
    &.pee {
      border-color: #8cc7ff;
      .check-box {
        background: #8cc7ff;
      }
    }
    &.poop {
      border-color: #ffd166;
      .check-box {
        background: #ffd166;
      }
    }
  }
}

.poop-analysis-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 40rpx;
  margin-bottom: 40rpx;

  .section-title {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 32rpx;
    .dot {
      width: 8rpx;
      height: 32rpx;
      background: #ffd166;
      border-radius: 4rpx;
    }
    text {
      font-size: 28rpx;
      font-weight: 800;
      color: $color-text-primary;
    }
  }
}

.analysis-item {
  .sub-label {
    font-size: 22rpx;
    font-weight: 800;
    color: $color-text-tertiary;
    margin-bottom: 20rpx;
    display: block;
  }
}

.color-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.color-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  min-width: 80rpx;
  padding: 12rpx;
  border-radius: $radius-sm;
  background: $color-bg-secondary;
  &.active {
    background: $color-primary-lighter;
    outline: 3rpx solid $color-primary;
  }
  .c-circle {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 1rpx solid $color-divider;
  }
  text {
    font-size: 18rpx;
    font-weight: 700;
    color: $color-text-secondary;
  }
}

.texture-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.txt-pill {
  height: 64rpx;
  background: $color-bg-secondary;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  color: $color-text-secondary;
  &.active {
    background: $color-primary;
    color: #fff;
  }
}

.form-divider {
  height: 1rpx;
  background: $color-divider;
  margin: 32rpx 0;
}

.form-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 12rpx 40rpx;
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
  &.stack {
    flex-direction: column;
    align-items: flex-start;
    gap: 16rpx;
  }
}

.info-guide {
  margin-top: 32rpx;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 0 12rpx;
  color: $color-text-tertiary;
  font-size: 22rpx;
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
