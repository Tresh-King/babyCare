<template>
  <view class="timeline-container">
    <!-- 顶部极简筛选 -->
    <view class="filter-glass-dock">
      <wd-tabs v-model="recordTypeFilter" swipeable class="premium-tabs">
        <wd-tab title="全部" name="all" />
        <wd-tab title="喂养" name="feeding" />
        <wd-tab title="睡眠" name="sleep" />
        <wd-tab title="尿布" name="diaper" />
        <wd-tab title="成长" name="growth" />
      </wd-tabs>

      <view class="date-quick-picker">
        <text
          v-for="opt in dateOptions"
          :key="opt.value"
          class="picker-btn"
          :class="{ active: filterType === opt.value }"
          @click="handleDateFilterChange({ value: opt.value })"
          >{{ opt.label }}</text
        >
      </view>
    </view>

    <!-- 主时间轴内容 -->
    <scroll-view
      class="timeline-scroll"
      scroll-y
      @scrolltolower="onReachBottom"
    >
      <view v-if="isLoggedIn">
        <view v-if="groupedRecords.length === 0" class="empty-state">
          <wd-status-tip
            image="content"
            description="这里空空如也，快去记录宝宝的点滴吧"
          />
        </view>

        <view v-else class="timeline-list">
          <view
            v-for="group in groupedRecords"
            :key="group.date"
            class="date-section"
          >
            <!-- 粘性日期头 -->
            <view class="date-sticky-header">
              <view class="date-bubble">{{ group.dateText }}</view>
            </view>

            <!-- 记录卡片流动 -->
            <view class="records-flow">
              <view
                v-for="record in group.records"
                :key="record.id"
                class="timeline-block"
                :class="`type-${record.type}`"
              >
                <!-- 轨道连接线 -->
                <view class="track-line"></view>
                <view class="track-dot"></view>

                <view class="record-content-card premium-shadow">
                  <view class="card-main-row">
                    <view class="type-badge" :class="record.type">
                      <image
                        :src="record.iconUrl"
                        mode="aspectFit"
                        class="icon"
                      />
                    </view>
                    <view class="info-body">
                      <view class="top-row">
                        <text class="type-name">{{ record.typeName }}</text>
                        <text class="time-stamp">{{ record.timeText }}</text>
                      </view>
                      <text class="detail-text">{{ record.detail }}</text>
                      <view v-if="record.originalRecord.note" class="note-box">
                        <wd-icon name="edit-1" size="14" color="#94A3B8" />
                        <text class="note-content">{{
                          record.originalRecord.note
                        }}</text>
                      </view>
                    </view>
                  </view>

                  <view class="card-footer-actions">
                    <view class="creator-info">
                      <text class="name">{{ record.createName }}</text>
                      <text v-if="record.relationship" class="rel"
                        >({{ record.relationship }})</text
                      >
                    </view>
                    <view class="btn-group">
                      <view
                        class="action-trigger edit"
                        @click="editRecord(record)"
                      >
                        <wd-icon name="edit-1" size="16" />
                      </view>
                      <view
                        class="action-trigger delete"
                        @click="deleteRecord(record)"
                      >
                        <wd-icon name="delete" size="16" />
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 加载更多 -->
          <view class="load-more-v2">
            <wd-loadmore :state="loadMoreState" />
          </view>
        </view>
      </view>
      <view v-else class="auth-placeholder">
        <wd-status-tip image="lock" description="请先登录以查看宝宝记录" />
        <wd-button round type="primary" @click="goToLogin">跳转登录</wd-button>
      </view>
    </scroll-view>

    <!-- 自定义日期选择器 (隐藏触发) -->
    <wd-datetime-picker
      id="custom-date-picker"
      ref="dateTimePickerRef"
      v-model="selectedDateTimestamp"
      :min-date="minDate"
      :max-date="maxDate"
      style="display: none"
      @confirm="onDateConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { onReachBottom, onPullDownRefresh } from "@dcloudio/uni-app";
import { isLoggedIn } from "@/store/user";
import { currentBaby } from "@/store/baby";
import {
  formatDate,
  isToday,
  getTodayStart,
  getWeekStart,
  getMonthStart,
} from "@/utils/date";
import { formatDuration } from "@/utils/common";

// 使用新的时间线聚合 API
import * as timelineApi from "@/api/timeline";
import type { TimelineItem } from "@/api/timeline";
import * as feedingApi from "@/api/feeding";
import * as diaperApi from "@/api/diaper";
import * as sleepApi from "@/api/sleep";

// 日期筛选
const filterType = ref<"today" | "week" | "month" | "custom">("today");
const customStartDate = ref(getTodayStart());
const customEndDate = ref(Date.now());

// 日期筛选选项
const dateOptions = [
  { label: "今天", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
  { label: "自定义", value: "custom" },
] as const;

const goToLogin = () => {
  uni.navigateTo({
    url: "/pages/user/login",
  });
};

// 记录类型筛选
const recordTypeFilter = ref<"all" | "feeding" | "diaper" | "sleep" | "growth">(
  "all",
);

// Wot UI 日期选择器相关
const selectedDateTimestamp = ref<number[]>([]);

// 时间线数据(从聚合 API 获取)
const timelineItems = ref<TimelineItem[]>([]);
const totalRecords = ref(0);
const dateTimePickerRef = ref<any>(null);
// 日期选择器的最小和最大日期
// 最小日期为当前宝宝的出生日期
const minDate = ref(Date.parse(currentBaby.value?.birthDate || ""));
const maxDate = ref(Date.now());
// 分页相关
const currentPage = ref(1);
const pageSize = ref(10);
const isLoadingMore = ref(false);
const hasMore = ref(true);

const handleDateFilterChange = ({
  value,
}: {
  value: "today" | "week" | "month" | "custom";
}) => {
  if (value === "custom") {
    dateTimePickerRef.value?.open();
  }
  filterType.value = value;
  // 重置分页，重新加载数据
  currentPage.value = 1;
  hasMore.value = true;
  loadRecords(true);
};

// 展示用的记录接口
interface TimelineRecord {
  id: string;
  type: "feeding" | "diaper" | "sleep" | "growth";
  time: number;
  iconUrl: string;
  typeName: string;
  timeText: string;
  detail: string;
  originalRecord: any;
  createName: string; // 创建者昵称
  relationship: string; // 创建者与宝宝的关系
}

// 转换时间线数据为展示格式
const allRecords = computed<TimelineRecord[]>(() => {
  if (!currentBaby.value) return [];

  const records: TimelineRecord[] = [];

  timelineItems.value.forEach((item) => {
    let iconUrl = "";
    let typeName = "";
    let detail = "";

    if (item.recordType === "feeding") {
      const record = item.detail as feedingApi.FeedingRecordResponse;
      iconUrl = "/static/breastfeeding.svg";
      typeName = "喂养";

      if (record.feedingType === "breast") {
        detail = `母乳喂养 ${formatDuration(record.duration || 0)}`;
        const feedingDetail = record.detail;
        if (feedingDetail && feedingDetail.type === "breast") {
          const breastSide = feedingDetail.side;
          if (breastSide === "left") detail += " (左侧)";
          else if (breastSide === "right") detail += " (右侧)";
          else if (breastSide === "both") detail += " (双侧)";
        }
      } else if (record.feedingType === "bottle") {
        const feedingDetail = record.detail;
        if (feedingDetail && feedingDetail.type === "bottle") {
          detail = `奶瓶喂养 ${record.amount}${feedingDetail.unit || "ml"}`;
          detail +=
            feedingDetail.bottleType === "formula" ? " (配方奶)" : " (母乳)";
        } else {
          detail = `奶瓶喂养 ${record.amount}ml`;
        }
      } else {
        const feedingDetail = record.detail;
        if (feedingDetail && feedingDetail.type === "food") {
          detail = `辅食: ${feedingDetail.foodName || "未知"}`;
        } else {
          detail = "辅食";
        }
      }
    } else if (item.recordType === "diaper") {
      const record = item.detail as diaperApi.DiaperRecordResponse;
      iconUrl = "/static/baby_changing_station.svg";
      typeName = "尿布";

      if (record.diaperType === "pee") detail = "小便";
      else if (record.diaperType === "poop") detail = "大便";
      else detail = "小便+大便";

      if (record.pooColor) detail += ` (${record.pooColor})`;
    } else if (item.recordType === "sleep") {
      const record = item.detail as sleepApi.SleepRecordResponse;
      iconUrl = "/static/moon_stars.svg";
      typeName = "睡眠";

      const duration = record.duration || 0;
      detail = `${
        record.sleepType === "nap" ? "小睡" : "夜间睡眠"
      } ${formatDuration(duration)}`;
    } else if (item.recordType === "growth") {
      iconUrl = "/static/monitoring.svg";
      typeName = "成长";
      const record = item.detail as any;
      const parts: string[] = [];
      if (record.height) parts.push(`身高 ${record.height}cm`);
      if (record.weight) parts.push(`体重 ${record.weight}kg`);
      if (record.headCircumference)
        parts.push(`头围 ${record.headCircumference}cm`);
      detail = parts.join(", ");
    }

    records.push({
      id: item.recordId,
      type: item.recordType,
      time: item.eventTime,
      iconUrl,
      typeName,
      timeText: formatDate(item.eventTime, "HH:mm"),
      detail,
      originalRecord: item.detail,
      createName: item.createName || "",
      relationship: item.relationship || "",
    });
  });

  return records;
});

// 按日期分组
const groupedRecords = computed(() => {
  const groups: {
    date: string;
    dateText: string;
    records: TimelineRecord[];
  }[] = [];

  allRecords.value.forEach((record) => {
    const date = formatDate(record.time, "YYYY-MM-DD");
    let group = groups.find((g) => g.date === date);

    if (!group) {
      let dateText = formatDate(record.time, "MM月DD日");
      if (isToday(record.time)) {
        dateText = "今天 " + dateText;
      }

      group = { date, dateText, records: [] };
      groups.push(group);
    }

    group.records.push(record);
  });

  return groups;
});

// 加载时间线记录
const loadRecords = async (
  isRefresh: boolean = false,
  pullDown: boolean = false,
) => {
  if (!currentBaby.value) return;
  if (isLoadingMore.value) return;
  if (!isRefresh && !hasMore.value) return;

  if (isRefresh) {
    currentPage.value = 1;
    timelineItems.value = [];
    hasMore.value = true;
  }

  const babyId = currentBaby.value.babyId;
  const pageToLoad = currentPage.value;

  let startTime = 0;
  let endTime = Date.now();

  if (filterType.value === "today") {
    startTime = getTodayStart();
  } else if (filterType.value === "week") {
    startTime = getWeekStart();
  } else if (filterType.value === "month") {
    startTime = getMonthStart();
  } else if (filterType.value === "custom") {
    startTime = customStartDate.value;
    endTime = customEndDate.value;
  }

  try {
    isLoadingMore.value = true;
    if (pullDown) uni.showNavigationBarLoading();

    const response = await timelineApi.apiFetchTimeline({
      babyId,
      startTime,
      endTime,
      recordType:
        recordTypeFilter.value === "all" ? "" : recordTypeFilter.value,
      page: pageToLoad,
      pageSize: pageSize.value,
    });

    const newItems = response.data.items || [];
    if (isRefresh) {
      timelineItems.value = newItems;
    } else {
      timelineItems.value.push(...newItems);
    }

    currentPage.value = pageToLoad + 1;
    totalRecords.value = response.data.total;
    hasMore.value = newItems.length >= pageSize.value;
  } catch (error) {
    console.error("加载失败:", error);
  } finally {
    if (pullDown) {
      uni.hideNavigationBarLoading();
      uni.stopPullDownRefresh();
    }
    isLoadingMore.value = false;
  }
};

onMounted(() => {
  if (isLoggedIn.value) loadRecords(true);
});

watch(recordTypeFilter, () => {
  loadRecords(true);
});

onPullDownRefresh(() => {
  loadRecords(true, true);
});

const onDateConfirm = ({ value }: { value: number[] }) => {
  if (!value || value.length === 0) return;
  const timestamp = value?.[0] || Date.now();
  const endTimestamp = value?.[1] || timestamp;
  customStartDate.value = new Date(timestamp).setHours(0, 0, 0, 0);
  customEndDate.value = new Date(endTimestamp).setHours(23, 59, 59, 999);
  filterType.value = "custom";
  loadRecords(true);
};

const editRecord = (record: TimelineRecord) => {
  let url = "";
  switch (record.type) {
    case "feeding":
      url = `/pages/record/feeding/feeding?editId=${record.id}`;
      break;
    case "sleep":
      url = `/pages/record/sleep/sleep?editId=${record.id}`;
      break;
    case "diaper":
      url = `/pages/record/diaper/diaper?editId=${record.id}`;
      break;
    case "growth":
      url = `/pages/record/growth/growth?editId=${record.id}`;
      break;
  }
  if (url) uni.navigateTo({ url });
};

const deleteRecord = async (record: TimelineRecord) => {
  uni.showModal({
    title: "确认删除",
    content: "确定要删除这条记录吗?",
    success: async (res) => {
      if (res.confirm) {
        try {
          if (record.type === "feeding")
            await feedingApi.apiDeleteFeedingRecord(record.id);
          else if (record.type === "diaper")
            await diaperApi.apiDeleteDiaperRecord(record.id);
          else if (record.type === "sleep")
            await sleepApi.apiDeleteSleepRecord(record.id);
          uni.showToast({ title: "删除成功", icon: "success" });
          await loadRecords(true);
        } catch (error: any) {
          uni.showToast({ title: error.message || "删除失败", icon: "none" });
        }
      }
    },
  });
};

const loadMoreState = computed(() => {
  if (!isLoggedIn.value || !currentBaby.value) return "finished";
  if (isLoadingMore.value) return "loading";
  return hasMore.value ? "loading" : "finished";
});
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.timeline-container {
  min-height: 100vh;
  background: $color-bg-secondary;
  display: flex;
  flex-direction: column;
}

.filter-glass-dock {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid rgba(123, 211, 162, 0.1);
}

.premium-tabs {
  --wd-tabs-nav-bg: transparent;
  --wd-tabs-line-color: #7bd3a2;
}

.date-quick-picker {
  display: flex;
  gap: 16rpx;
  padding: 8rpx 32rpx;

  .picker-btn {
    font-size: 24rpx;
    color: $color-text-tertiary;
    padding: 8rpx 24rpx;
    background: #fff;
    border-radius: 100rpx;
    border: 1px solid $color-border-light;

    &.active {
      background: $color-primary;
      color: #fff;
      border-color: $color-primary;
      box-shadow: 0 4rpx 12rpx rgba(123, 211, 162, 0.3);
    }
  }
}

.timeline-scroll {
  flex: 1;
  height: 0;
}

.timeline-list {
  padding: 32rpx;
}

.date-section {
  margin-bottom: 40rpx;
}

.date-sticky-header {
  position: sticky;
  top: 140rpx;
  z-index: 10;
  display: flex;
  justify-content: center;
  margin-bottom: 32rpx;

  .date-bubble {
    background: $color-primary-lighter;
    color: $color-primary-dark;
    font-size: 22rpx;
    font-weight: 700;
    padding: 8rpx 32rpx;
    border-radius: 100rpx;
    border: 1px solid rgba(123, 211, 162, 0.2);
  }
}

.records-flow {
  display: flex;
  flex-direction: column;
}

.timeline-block {
  position: relative;
  padding-left: 48rpx;
  margin-bottom: 24rpx;

  .track-line {
    position: absolute;
    left: 10rpx;
    top: 32rpx;
    bottom: -32rpx;
    width: 4rpx;
    background: rgba(123, 211, 162, 0.1);
  }

  .track-dot {
    position: absolute;
    left: 0;
    top: 32rpx;
    width: 24rpx;
    height: 24rpx;
    background: #fff;
    border: 5rpx solid $color-primary;
    border-radius: 50%;
    z-index: 2;
    box-shadow: 0 0 0 8rpx rgba(123, 211, 162, 0.1);
  }

  &.type-sleep .track-dot {
    border-color: #8cc7ff;
    box-shadow: 0 0 0 8rpx rgba(140, 199, 255, 0.1);
  }
  &.type-diaper .track-dot {
    border-color: #ffd166;
    box-shadow: 0 0 0 8rpx rgba(255, 209, 102, 0.1);
  }
  &.type-growth .track-dot {
    border-color: #b29cef;
    box-shadow: 0 0 0 8rpx rgba(178, 156, 239, 0.1);
  }
}

.record-content-card {
  background: #fff;
  border-radius: $radius-md;
  padding: $spacing-md;
  border: 1px solid $color-border-light;
}

.card-main-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.type-badge {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .icon {
    width: 44rpx;
    height: 44rpx;
  }

  &.feeding {
    background: #e9f7f0;
  }
  &.sleep {
    background: #ebf4ff;
  }
  &.diaper {
    background: #fff4e6;
  }
  &.growth {
    background: #f3eeff;
  }
}

.info-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.type-name {
  font-size: 28rpx;
  font-weight: 700;
  color: $color-text-primary;
}

.time-stamp {
  font-size: 22rpx;
  color: $color-text-tertiary;
}

.detail-text {
  font-size: 26rpx;
  color: $color-text-secondary;
}

.note-box {
  margin-top: 12rpx;
  background: $color-bg-secondary;
  padding: 8rpx 16rpx;
  border-radius: $radius-xs;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.note-content {
  font-size: 22rpx;
  color: $color-text-tertiary;
}

.card-footer-actions {
  padding-top: 16rpx;
  border-top: 1rpx solid $color-divider;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.creator-info {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.creator-info .name {
  font-size: 22rpx;
  color: $color-text-tertiary;
}
.creator-info .rel {
  font-size: 20rpx;
  color: $color-text-tertiary;
}

.btn-group {
  display: flex;
  gap: 20rpx;
}

.action-trigger {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-bg-tertiary;
}

.action-trigger.edit {
  color: $color-primary;
}
.action-trigger.delete {
  color: $color-danger;
}

.auth-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 64rpx;
  gap: 40rpx;
}
</style>
