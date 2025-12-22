<template>
  <view class="vaccine-container">
    <wd-navbar
      title="疫苗助手"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
    >
      <template #capsule>
        <wd-navbar-capsule @back="goBack" @back-home="goBackHome" />
      </template>
    </wd-navbar>

    <scroll-view class="vaccine-scroll" scroll-y @scrolltolower="onReachBottom">
      <view v-if="currentBaby" class="vaccine-content">
        <!-- 核心统计卡片 (Glassmorphism) -->
        <view class="hero-stats-card premium-shadow">
          <view class="stats-bg-decoration"></view>
          <view class="card-content">
            <view class="stats-main">
              <view class="completion-info">
                <text class="label">接种完成率</text>
                <view class="value-row">
                  <text class="large-value">{{
                    completionStats.completionRate
                  }}</text>
                  <text class="unit">%</text>
                </view>
              </view>
              <view class="progress-ring-box">
                <!-- 简单的环形进度示意，实际可用 canvas 或 svg -->
                <view class="ring-track">
                  <view
                    class="ring-fill"
                    :style="{ '--percent': completionStats.completionRate }"
                  ></view>
                  <view class="ring-center">
                    <wd-icon name="check-circle" size="24" color="#7BD3A2" />
                  </view>
                </view>
              </view>
            </view>
            <view class="stats-footer">
              <view class="stat-item">
                <text class="s-val">{{ completionStats.completed }}</text>
                <text class="s-lab">已接种</text>
              </view>
              <view class="stat-divider"></view>
              <view class="stat-item">
                <text class="s-val">{{ completionStats.pending }}</text>
                <text class="s-lab">待接种</text>
              </view>
              <view class="stat-divider"></view>
              <view class="stat-item">
                <text class="s-val">{{ completionStats.skipped }}</text>
                <text class="s-lab">已跳过</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 即将到期提醒 -->
        <view v-if="upcomingSchedules.length > 0" class="alert-section">
          <view class="section-header">
            <text class="title">近期待办</text>
            <text class="count">{{ upcomingSchedules.length }}</text>
          </view>
          <view class="alert-horizontal-scroll">
            <view
              v-for="schedule in upcomingSchedules"
              :key="schedule.scheduleId"
              class="alert-card premium-shadow"
              @click="handleRecordVaccine(schedule)"
            >
              <view class="alert-icon-box">
                <image src="/static/recent.svg" mode="aspectFit" class="icon" />
              </view>
              <view class="alert-info">
                <text class="v-name">{{ schedule.vaccineName }}</text>
                <text class="v-meta"
                  >第{{ schedule.doseNumber }}针 ·
                  {{ schedule.ageInMonths }}个月</text
                >
              </view>
              <wd-icon name="arrow-right" size="16" color="#94A3B8" />
            </view>
          </view>
        </view>

        <!-- 详细计划列表 -->
        <view class="plan-section">
          <view class="sticky-tabs-wrapper">
            <wd-tabs v-model="activeTab" class="premium-tabs">
              <wd-tab title="全部" name="all" />
              <wd-tab title="已接种" name="completed" />
              <wd-tab title="待接种" name="pending" />
              <wd-tab title="已跳过" name="skipped" />
            </wd-tabs>
            <view class="add-btn-fab" @click="showAddDialog = true">
              <wd-icon name="add" size="20" color="#FFF" />
            </view>
          </view>

          <view class="vaccine-grid">
            <view
              v-for="schedule in vaccineSchedules"
              :key="schedule.scheduleId"
              class="vaccine-block premium-shadow"
              :class="schedule.vaccinationStatus"
            >
              <view class="block-top">
                <view class="badge-row">
                  <text v-if="schedule.isRequired" class="tag required"
                    >必打</text
                  >
                  <text v-if="schedule.isCustom" class="tag custom"
                    >自定义</text
                  >
                  <text class="age-badge">{{ schedule.ageInMonths }}M</text>
                </view>
                <text class="vaccine-title single-line">{{
                  schedule.vaccineName
                }}</text>
                <text class="vaccine-dose text-tertiary"
                  >第{{ schedule.doseNumber }}剂</text
                >
              </view>

              <view class="block-actions">
                <template v-if="schedule.vaccinationStatus === 'pending'">
                  <view
                    class="main-action"
                    @click="handleRecordVaccine(schedule)"
                  >
                    <wd-icon name="edit-1" size="14" />
                    <text>记录</text>
                  </view>
                  <view class="sub-action" @click="handleSkipSchedule(schedule)"
                    >跳过</view
                  >
                </template>
                <template
                  v-else-if="schedule.vaccinationStatus === 'completed'"
                >
                  <view class="status-marker completed">
                    <wd-icon name="success-no-circle" size="14" />
                    <text>{{
                      formatDate(schedule.vaccineDate || 0, "MM-DD")
                    }}</text>
                  </view>
                </template>
                <template v-else>
                  <view class="status-marker skipped">
                    <text>已跳过</text>
                  </view>
                </template>
              </view>
            </view>
          </view>

          <view class="load-more-padding">
            <wd-loadmore :state="loadMoreState" />
          </view>
        </view>
      </view>

      <view v-else class="empty-placeholder">
        <wd-status-tip
          image="content"
          description="未发现宝宝信息，请先添加宝宝"
        />
      </view>
    </scroll-view>

    <!-- 记录对话框 (Redesigned) -->
    <wd-popup
      v-model="showRecordDialog"
      position="bottom"
      round
      safe-area-inset-bottom
    >
      <view class="premium-popup-content">
        <view class="popup-header">
          <text class="popup-title">记录疫苗接种</text>
          <wd-icon name="close" size="24" @click="showRecordDialog = false" />
        </view>

        <view class="form-body">
          <view class="form-item-v2">
            <text class="label">接种日期</text>
            <wd-datetime-picker v-model="recordForm.vaccineDate" type="date" />
          </view>

          <view class="form-item-v2">
            <text class="label">接种医院 *</text>
            <wd-input
              v-model="recordForm.hospital"
              placeholder="请输入接种医院名称"
              no-border
            />
          </view>

          <view class="form-row">
            <view class="form-item-v2 flex-1">
              <text class="label">疫苗批号</text>
              <wd-input
                v-model="recordForm.batchNumber"
                placeholder="可选"
                no-border
              />
            </view>
            <view class="form-item-v2 flex-1">
              <text class="label">接种医生</text>
              <wd-input
                v-model="recordForm.doctor"
                placeholder="可选"
                no-border
              />
            </view>
          </view>

          <view class="form-item-v2">
            <text class="label">备注 / 不良反应</text>
            <wd-textarea
              v-model="recordForm.note"
              placeholder="记录宝宝接种后的反应..."
              auto-height
            />
          </view>
        </view>

        <view class="popup-footer">
          <wd-button block round type="primary" @click="handleSaveRecord"
            >提交记录</wd-button
          >
        </view>
      </view>
    </wd-popup>

    <!-- 自定义计划对话框 -->
    <wd-popup
      v-model="showAddDialog"
      position="bottom"
      round
      safe-area-inset-bottom
    >
      <view class="premium-popup-content">
        <view class="popup-header">
          <text class="popup-title">{{
            isEdit ? "编辑计划" : "新增自定义计划"
          }}</text>
          <wd-icon name="close" size="24" @click="showAddDialog = false" />
        </view>

        <view class="form-body">
          <wd-input
            v-model="planForm.vaccineName"
            label="疫苗名称"
            placeholder="例如：五联疫苗"
            required
          />
          <wd-input
            v-model="planForm.vaccineType"
            label="类型标识"
            placeholder="例如：DTaP"
            required
          />
          <view class="form-row">
            <wd-input
              v-model.number="planForm.ageInMonths"
              label="接种月龄"
              type="number"
              placeholder="0-36"
              required
            />
            <wd-input
              v-model.number="planForm.doseNumber"
              label="接种剂次"
              type="number"
              placeholder="1"
              required
            />
          </view>
          <wd-cell title="国家免疫规划疫苗">
            <wd-switch v-model="planForm.isRequired" />
          </wd-cell>
          <wd-textarea
            v-model="planForm.description"
            label="疫苗说明"
            placeholder="关于该疫苗的接种建议..."
          />
        </view>

        <view class="popup-footer">
          <wd-button block round type="primary" @click="handleSubmitPlan"
            >确认保存</wd-button
          >
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { onReachBottom } from "@dcloudio/uni-app";
import { currentBaby } from "@/store/baby";
import { userInfo } from "@/store/user";
import { formatDate } from "@/utils/date";
import { goBack, goBackHome } from "@/utils/common";
import * as vaccineApi from "@/api/vaccine";

const activeTab = ref<"all" | "completed" | "pending" | "skipped">("all");
const showRecordDialog = ref(false);
const showAddDialog = ref(false);
const isEdit = ref(false);
const editPlanId = ref("");

const vaccineSchedules = ref<vaccineApi.VaccineScheduleResponse[]>([]);
const vaccineStats = ref({
  total: 0,
  completed: 0,
  pending: 0,
  skipped: 0,
  completionRate: 0,
});

const currentPage = ref(1);
const pageSize = ref(10);
const isLoadingMore = ref(false);
const hasMore = ref(true);
const totalSchedules = ref(0);

const recordForm = ref({
  scheduleId: "",
  vaccineName: "",
  vaccineDate: Date.now(),
  hospital: "",
  batchNumber: "",
  doctor: "",
  reaction: "",
  note: "",
});

const planForm = ref({
  vaccineName: "",
  vaccineType: "",
  ageInMonths: 0,
  doseNumber: 1,
  reminderDays: 7,
  isRequired: true,
  description: "",
});

const loadVaccineData = async (isRefresh: boolean = false) => {
  if (!currentBaby.value) return;
  if (isLoadingMore.value) return;
  if (!isRefresh && !hasMore.value) return;

  if (isRefresh) {
    currentPage.value = 1;
    vaccineSchedules.value = [];
    hasMore.value = true;
  }

  try {
    isLoadingMore.value = true;
    const babyId = currentBaby.value.babyId;
    const status = activeTab.value === "all" ? undefined : activeTab.value;

    const [scheduleData, statsData] = await Promise.all([
      vaccineApi.apiFetchVaccineSchedules(babyId, {
        page: currentPage.value,
        pageSize: pageSize.value,
        status: status,
      }),
      vaccineApi.apiFetchVaccineScheduleStatistics(babyId),
    ]);

    if (isRefresh) {
      vaccineSchedules.value = scheduleData.schedules || [];
    } else {
      vaccineSchedules.value.push(...(scheduleData.schedules || []));
    }

    vaccineStats.value = statsData;
    totalSchedules.value = scheduleData.total;
    hasMore.value = vaccineSchedules.value.length < totalSchedules.value;
    currentPage.value++;
  } catch (error) {
    console.error("加载疫苗数据失败:", error);
  } finally {
    isLoadingMore.value = false;
  }
};

const completionStats = computed(() => vaccineStats.value);
const upcomingSchedules = computed(() => {
  return vaccineSchedules.value
    .filter((s) => s.vaccinationStatus === "pending")
    .sort((a, b) => a.ageInMonths - b.ageInMonths)
    .slice(0, 3);
});

const loadMoreState = computed(() => {
  if (!currentBaby.value) return "finished";
  if (isLoadingMore.value) return "loading";
  return hasMore.value ? "loading" : "finished";
});

watch(activeTab, () => loadVaccineData(true));

onReachBottom(() => loadVaccineData(false));

const handleRecordVaccine = (schedule: vaccineApi.VaccineScheduleResponse) => {
  recordForm.value = {
    scheduleId: schedule.scheduleId,
    vaccineName: schedule.vaccineName,
    vaccineDate: Date.now(),
    hospital: "",
    batchNumber: "",
    doctor: "",
    reaction: "",
    note: "",
  };
  showRecordDialog.value = true;
};

const handleSaveRecord = async () => {
  if (!currentBaby.value) return;
  if (!recordForm.value.hospital.trim()) {
    uni.showToast({ title: "请输入接种医院", icon: "none" });
    return;
  }

  try {
    await vaccineApi.apiUpdateVaccineSchedule(
      currentBaby.value.babyId,
      recordForm.value.scheduleId,
      {
        vaccinationStatus: "completed",
        vaccineDate: recordForm.value.vaccineDate,
        hospital: recordForm.value.hospital.trim(),
        batchNumber: recordForm.value.batchNumber.trim() || undefined,
        doctor: recordForm.value.doctor.trim() || undefined,
        note: recordForm.value.note.trim() || undefined,
      },
    );
    uni.showToast({ title: "记录成功", icon: "success" });
    showRecordDialog.value = false;
    await loadVaccineData(true);
  } catch (error: any) {
    uni.showToast({ title: error.message || "失败", icon: "none" });
  }
};

const handleSkipSchedule = async (
  schedule: vaccineApi.VaccineScheduleResponse,
) => {
  if (!currentBaby.value) return;
  uni.showModal({
    title: "跳过接种",
    content: `确定要跳过「${schedule.vaccineName}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await vaccineApi.apiUpdateVaccineSchedule(
            currentBaby.value!.babyId,
            schedule.scheduleId,
            {
              vaccinationStatus: "skipped",
            },
          );
          uni.showToast({ title: "已跳过", icon: "success" });
          await loadVaccineData(true);
        } catch (error) {
          uni.showToast({ title: "处理失败", icon: "none" });
        }
      }
    },
  });
};

const handleSubmitPlan = async () => {
  if (!currentBaby.value) return;
  try {
    if (isEdit.value) {
      // Edit logic here
    } else {
      await vaccineApi.apiCreateCustomSchedule(
        currentBaby.value.babyId,
        planForm.value,
      );
      uni.showToast({ title: "添加成功", icon: "success" });
    }
    showAddDialog.value = false;
    await loadVaccineData(true);
  } catch (error: any) {
    uni.showToast({ title: error.message || "操作失败", icon: "none" });
  }
};

onMounted(() => loadVaccineData(true));
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.vaccine-container {
  min-height: 100vh;
  background: $color-bg-secondary;
  display: flex;
  flex-direction: column;
}

.vaccine-scroll {
  flex: 1;
  height: 0;
}

.vaccine-content {
  padding: 32rpx;
}

// ===== Hero Stats =====
.hero-stats-card {
  position: relative;
  background: linear-gradient(135deg, #7bd3a2 0%, #52c41a 100%);
  border-radius: $radius-lg;
  padding: 40rpx;
  overflow: hidden;
  margin-bottom: 40rpx;

  .stats-bg-decoration {
    position: absolute;
    right: -40rpx;
    top: -40rpx;
    width: 200rpx;
    height: 200rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  .card-content {
    position: relative;
    z-index: 1;
  }

  .stats-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40rpx;

    .completion-info {
      .label {
        color: rgba(255, 255, 255, 0.8);
        font-size: 24rpx;
        font-weight: 500;
      }
      .value-row {
        display: flex;
        align-items: baseline;
        .large-value {
          color: #fff;
          font-size: 72rpx;
          font-weight: 800;
          font-family: "Outfit";
        }
        .unit {
          color: #fff;
          font-size: 28rpx;
          margin-left: 8rpx;
          font-weight: 600;
        }
      }
    }
  }

  .progress-ring-box {
    width: 120rpx;
    height: 120rpx;
    position: relative;
    .ring-track {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      .ring-center {
        width: 80%;
        height: 80%;
        background: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }

  .stats-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.15);
    border-radius: $radius-md;
    padding: 24rpx;

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      .s-val {
        color: #fff;
        font-size: 32rpx;
        font-weight: 700;
      }
      .s-lab {
        color: rgba(255, 255, 255, 0.8);
        font-size: 20rpx;
        margin-top: 4rpx;
      }
    }
    .stat-divider {
      width: 1px;
      height: 32rpx;
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

// ===== Alerts =====
.alert-section {
  margin-bottom: 40rpx;
  .section-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;
    .title {
      font-size: 30rpx;
      font-weight: 700;
      color: $color-text-primary;
    }
    .count {
      background: $color-danger;
      color: #fff;
      font-size: 20rpx;
      padding: 2rpx 12rpx;
      border-radius: 100rpx;
    }
  }
}

.alert-horizontal-scroll {
  display: flex;
  gap: 20rpx;
}

.alert-card {
  background: #fff;
  border-radius: $radius-md;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-width: 480rpx;
  border-left: 8rpx solid $color-primary;

  .alert-icon-box {
    width: 72rpx;
    height: 72rpx;
    background: $color-primary-lighter;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    .icon {
      width: 40rpx;
      height: 40rpx;
    }
  }

  .alert-info {
    flex: 1;
    .v-name {
      font-size: 28rpx;
      font-weight: 700;
      color: $color-text-primary;
      display: block;
    }
    .v-meta {
      font-size: 22rpx;
      color: $color-text-tertiary;
      margin-top: 4rpx;
    }
  }
}

// ===== Plans Grid =====
.plan-section {
  .sticky-tabs-wrapper {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    background: $color-bg-secondary;
    padding-bottom: 20rpx;
  }

  .premium-tabs {
    flex: 1;
    --wd-tabs-nav-bg: transparent;
  }

  .add-btn-fab {
    width: 64rpx;
    height: 64rpx;
    background: $color-primary;
    border-radius: 50%;
    margin-left: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 12rpx rgba(123, 211, 162, 0.4);
  }
}

.vaccine-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.vaccine-block {
  background: #fff;
  border-radius: $radius-md;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid $color-border-light;
  transition: all 0.3s;

  &.completed {
    border-color: rgba(123, 211, 162, 0.3);
    background: #f8fcf9;
  }
  &.skipped {
    opacity: 0.6;
  }

  .block-top {
    margin-bottom: 20rpx;
    .badge-row {
      display: flex;
      gap: 8rpx;
      margin-bottom: 12rpx;
    }
    .tag {
      font-size: 18rpx;
      padding: 2rpx 8rpx;
      border-radius: 4rpx;
    }
    .tag.required {
      background: #e9f7f0;
      color: #52c41a;
    }
    .tag.custom {
      background: #f3eeff;
      color: #b29cef;
    }
    .age-badge {
      font-size: 18rpx;
      color: $color-text-tertiary;
      font-weight: 700;
      margin-left: auto;
    }

    .vaccine-title {
      font-size: 26rpx;
      font-weight: 700;
      color: $color-text-primary;
      margin-top: 8rpx;
    }
    .vaccine-dose {
      font-size: 22rpx;
      margin-top: 4rpx;
    }
  }

  .block-actions {
    display: flex;
    gap: 12rpx;
    .main-action {
      flex: 1;
      height: 48rpx;
      background: $color-primary;
      color: #fff;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4rpx;
      font-size: 20rpx;
      font-weight: 600;
    }
    .sub-action {
      font-size: 20rpx;
      color: $color-text-tertiary;
      line-height: 48rpx;
      padding: 0 8rpx;
    }
    .status-marker {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 20rpx;
      font-weight: 600;
      &.completed {
        color: $color-primary;
      }
      &.skipped {
        color: $color-text-tertiary;
      }
    }
  }
}

// ===== Premium Popups =====
.premium-popup-content {
  padding: 40rpx;
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40rpx;
    .popup-title {
      font-size: 34rpx;
      font-weight: 800;
      color: $color-text-primary;
    }
  }
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.form-item-v2 {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  .label {
    font-size: 24rpx;
    font-weight: 700;
    color: $color-text-secondary;
    padding-left: 8rpx;
  }
  :deep(.wd-input),
  :deep(.wd-textarea) {
    background: $color-bg-secondary;
    border-radius: $radius-sm;
    padding: 12rpx 20rpx;
  }
}

.form-row {
  display: flex;
  gap: 24rpx;
  .flex-1 {
    flex: 1;
  }
}

.popup-footer {
  margin-top: 60rpx;
}

.load-more-padding {
  margin-top: 40rpx;
  padding-bottom: 60rpx;
}
</style>
