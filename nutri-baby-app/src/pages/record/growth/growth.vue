<template>
  <view class="growth-container">
    <wd-navbar
      title="成长记录"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      @click-left="goBack"
    />

    <scroll-view class="growth-scroll" scroll-y>
      <view class="growth-content">
        <!-- 最新数据卡片 (Premium Gradient Card) -->
        <view v-if="latestRecord" class="hero-growth-card premium-shadow">
          <view class="card-glow"></view>
          <view class="header">
            <text class="title">最新成长数据</text>
            <text class="date">{{
              formatDate(latestRecord.measureTime, "MM-DD HH:mm")
            }}</text>
          </view>

          <view class="stats-row">
            <view v-if="latestRecord.height" class="stat-box">
              <text class="val">{{ latestRecord.height }}</text>
              <text class="unit">身高 cm</text>
            </view>
            <view class="stat-divider"></view>
            <view v-if="latestRecord.weight" class="stat-box">
              <text class="val">{{ latestRecord.weight }}</text>
              <text class="unit">体重 g</text>
            </view>
            <view class="stat-divider"></view>
            <view v-if="latestRecord.headCircumference" class="stat-box">
              <text class="val">{{ latestRecord.headCircumference }}</text>
              <text class="unit">头围 cm</text>
            </view>
          </view>
        </view>

        <!-- 添加记录触发 -->
        <view class="add-btn-wrapper">
          <wd-button
            block
            round
            size="large"
            type="primary"
            @click="showAddDialog = true"
          >
            <wd-icon name="add" size="20" />
            <text>录入新数据</text>
          </wd-button>
        </view>

        <!-- 历史趋势列表 -->
        <view class="history-list-section">
          <view class="section-header">
            <text>历史足迹</text>
          </view>

          <view v-if="recordList.length === 0" class="empty-v2">
            <wd-status-tip image="content" description="开始记录第1次数据吧" />
          </view>

          <view v-else class="v-timeline">
            <view
              v-for="r in recordList"
              :key="r.recordId"
              class="v-record-block premium-shadow"
            >
              <view class="v-left">
                <text class="v-day">{{ formatDate(r.measureTime, "DD") }}</text>
                <text class="v-month">{{
                  formatDate(r.measureTime, "MM月")
                }}</text>
              </view>
              <view class="v-main">
                <view class="data-pills">
                  <view v-if="r.height" class="p">📏 {{ r.height }}cm</view>
                  <view v-if="r.weight" class="p">⚖️ {{ r.weight }}g</view>
                  <view v-if="r.headCircumference" class="p"
                    >📐 {{ r.headCircumference }}cm</view
                  >
                </view>
                <text v-if="r.note" class="v-note">{{ r.note }}</text>
              </view>
              <view class="v-actions">
                <wd-icon
                  name="delete"
                  size="18"
                  color="#CBD5E1"
                  @click="handleDelete(r.recordId)"
                />
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 录入弹窗 -->
    <wd-popup
      v-model="showAddDialog"
      position="bottom"
      round
      safe-area-inset-bottom
    >
      <view class="premium-popup-content">
        <view class="popup-header">
          <text class="popup-title">成长数据录入</text>
          <wd-icon name="close" size="24" @click="showAddDialog = false" />
        </view>

        <view class="form-grid-v2">
          <view class="f-item">
            <text class="l">测量身高 (cm)</text>
            <wd-input
              v-model="formData.height"
              type="digit"
              placeholder="0.0"
              no-border
            />
          </view>
          <view class="f-item">
            <text class="l">测量体重 (g)</text>
            <wd-input
              v-model="formData.weight"
              type="digit"
              placeholder="0"
              no-border
            />
          </view>
          <view class="f-item">
            <text class="l">测量头围 (cm)</text>
            <wd-input
              v-model="formData.headCircumference"
              type="digit"
              placeholder="0.0"
              no-border
            />
          </view>
          <view class="f-item full">
            <text class="l">备注 (可选)</text>
            <wd-input
              v-model="formData.note"
              placeholder="如：体检记录"
              no-border
            />
          </view>
          <view class="f-item full">
            <text class="l">测量日期</text>
            <wd-datetime-picker v-model="formData.time" type="date" no-border />
          </view>
        </view>

        <view class="popup-footer">
          <wd-button block round size="large" @click="handleSubmit"
            >保存成长数据</wd-button
          >
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { currentBaby } from "@/store/baby";
import { formatDate } from "@/utils/date";
import { goBack } from "@/utils/common";
import * as growthApi from "@/api/growth";

const records = ref<any[]>([]);
const latestRecord = computed(() => records.value[0] || null);
const recordList = computed(() => records.value);

const showAddDialog = ref(false);
const editId = ref("");
const isEditing = computed(() => !!editId.value);

const formData = ref({
  height: "",
  weight: "",
  headCircumference: "",
  time: Date.now(),
  note: "",
});

const loadRecords = async () => {
  if (!currentBaby.value) return;
  try {
    const data = await growthApi.apiFetchGrowthRecords({
      babyId: currentBaby.value.babyId,
      pageSize: 50,
    });
    records.value = data.records;
  } catch (e) {}
};

onMounted(() => loadRecords());

const handleSubmit = async () => {
  if (!currentBaby.value) return;
  const h = parseFloat(formData.value.height),
    w = parseFloat(formData.value.weight),
    hc = parseFloat(formData.value.headCircumference);
  if (!h && !w && !hc) return;

  try {
    const payload = {
      babyId: currentBaby.value.babyId,
      measureTime: formData.value.time,
      height: h || undefined,
      weight: w || undefined,
      headCircumference: hc || undefined,
      note: formData.value.note || undefined,
    };
    if (isEditing.value)
      await growthApi.apiUpdateGrowthRecord(editId.value, payload);
    else await growthApi.apiCreateGrowthRecord(payload);

    uni.showToast({ title: "已保存", icon: "success" });
    showAddDialog.value = false;
    formData.value = {
      height: "",
      weight: "",
      headCircumference: "",
      time: Date.now(),
      note: "",
    };
    loadRecords();
  } catch (e) {}
};

const handleDelete = (id: string) => {
  uni.showModal({
    title: "删除确认",
    content: "确定删除此条成长记录？",
    success: async (res) => {
      if (res.confirm) {
        await growthApi.apiDeleteGrowthRecord(id);
        loadRecords();
      }
    },
  });
};
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.growth-container {
  min-height: 100vh;
  background: $color-bg-secondary;
}

.growth-scroll {
  height: calc(100vh - 160rpx);
}

.growth-content {
  padding: 32rpx;
}

.hero-growth-card {
  background: linear-gradient(
    135deg,
    $color-primary-dark 0%,
    $color-primary 100%
  );
  border-radius: $radius-lg;
  padding: 48rpx;
  color: #fff;
  position: relative;
  overflow: hidden;
  margin-bottom: 40rpx;

  .card-glow {
    position: absolute;
    top: -50rpx;
    right: -50rpx;
    width: 200rpx;
    height: 200rpx;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    filter: blur(40rpx);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40rpx;
    .title {
      font-size: 32rpx;
      font-weight: 800;
    }
    .date {
      font-size: 22rpx;
      opacity: 0.8;
      font-weight: 600;
    }
  }
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .stat-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    .val {
      font-size: 40rpx;
      font-weight: 800;
      font-family: "Outfit";
    }
    .unit {
      font-size: 20rpx;
      opacity: 0.8;
      font-weight: 600;
      margin-top: 4rpx;
    }
  }
  .stat-divider {
    width: 1px;
    height: 40rpx;
    background: rgba(255, 255, 255, 0.2);
  }
}

.add-btn-wrapper {
  margin-bottom: 48rpx;
}

.section-header {
  font-size: 28rpx;
  font-weight: 800;
  color: $color-text-primary;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
}

.v-record-block {
  background: #fff;
  border-radius: $radius-md;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-bottom: 24rpx;
  border: 1px solid $color-border-light;

  .v-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80rpx;
    .v-day {
      font-size: 36rpx;
      font-weight: 800;
      color: $color-primary-dark;
    }
    .v-month {
      font-size: 18rpx;
      font-weight: 700;
      color: $color-text-tertiary;
    }
  }

  .v-main {
    flex: 1;
    .data-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;
      margin-bottom: 8rpx;
      .p {
        font-size: 24rpx;
        font-weight: 700;
        color: $color-text-secondary;
        background: $color-bg-secondary;
        padding: 4rpx 16rpx;
        border-radius: 8rpx;
      }
    }
    .v-note {
      font-size: 22rpx;
      color: $color-text-tertiary;
      font-weight: 500;
    }
  }
}

.form-grid-v2 {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  .f-item {
    flex: 1;
    min-width: 45%;
    background: $color-bg-secondary;
    padding: 24rpx;
    border-radius: $radius-md;
    .l {
      font-size: 22rpx;
      font-weight: 700;
      color: $color-text-tertiary;
      margin-bottom: 8rpx;
      display: block;
    }
    &.full {
      min-width: 100%;
    }
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

.popup-footer {
  margin-top: 48rpx;
}
</style>
