<template>
  <view class="ai-chart-container">
    <view v-if="title || subtitle" class="chart-header">
      <text v-if="title" class="chart-title">{{ title }}</text>
      <text v-if="subtitle" class="chart-subtitle">{{ subtitle }}</text>
    </view>

    <view class="chart-content">
      <canvas
        :id="chartId"
        :canvas-id="chartId"
        class="ai-chart-canvas"
        @touchstart="touchStart"
        @touchmove="touchMove"
        @touchend="touchEnd"
      />
    </view>

    <view v-if="showLegend && seriesData.length" class="chart-legend">
      <view
        v-for="(item, index) in seriesData"
        :key="index"
        class="legend-item"
        @tap="toggleSeries(index)"
      >
        <view
          class="legend-color"
          :style="{
            backgroundColor:
              item.color || defaultColors[index % defaultColors.length],
          }"
        />
        <text class="legend-text">{{ item.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useUChart } from "@/composables/useUChart";
import type { AISeries, AIChartData, AIAnalysisType } from "@/types/ai";

interface Props {
  chartId: string;
  data: AIChartData;
  type?: "line" | "column" | "radar" | "pie";
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showActions?: boolean;
  height?: number;
  width?: number;
  animation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: "line",
  showLegend: true,
  showActions: false,
  height: 300,
  width: 750,
  animation: true,
});

const emit = defineEmits(["refresh", "export", "seriesToggle"]);

// 默认颜色配置
const defaultColors = [
  "#7dd3a2", // 绿色
  "#52c41a", // 深绿色
  "#ffa940", // 橙色
  "#1890ff", // 蓝色
  "#ff6b6b", // 红色
  "#722ed1", // 紫色
  "#13c2c2", // 青色
  "#faad14", // 黄色
];

// 使用 UChart composable
const { chartData, chartOpts, updateChartData, updateChartOpts } = useUChart(
  props.type as any,
);

const seriesData = ref<any[]>([]);

// 更新图表
const refreshInternal = async () => {
  if (!props.data) return;

  const categories = props.data.categories || [];
  const series = props.data.series.map((s, index) => ({
    name: s.name,
    data: s.data,
    color: s.color || defaultColors[index % defaultColors.length],
  }));

  seriesData.value = series;

  await updateChartData({
    categories,
    series,
  });
};

// 监听 props
watch(() => props.data, refreshInternal, { deep: true, immediate: true });

const touchStart = (e: any) => {};
const touchMove = (e: any) => {};
const touchEnd = (e: any) => {};

const toggleSeries = (index: number) => {
  // Toggle logic can be added if useUChart supports it
};

const exportChart = () => {
  emit("export", chartData.value);
};

defineExpose({
  refreshChart: refreshInternal,
  exportChart,
});
</script>

<style lang="scss" scoped>
.ai-chart-container {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin: 16rpx 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .chart-header {
    margin-bottom: 24rpx;
    text-align: center;

    .chart-title {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8rpx;
    }

    .chart-subtitle {
      display: block;
      font-size: 24rpx;
      color: #999999;
    }
  }

  .chart-content {
    position: relative;
    margin-bottom: 24rpx;
  }

  .ai-chart-canvas {
    width: 100%;
    height: 300rpx;
  }

  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24rpx;
    margin-bottom: 24rpx;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8rpx;
      padding: 8rpx 16rpx;
      background: #f5f5f5;
      border-radius: 8rpx;
      transition: all 0.2s;

      &:active {
        transform: scale(0.95);
      }

      .legend-color {
        width: 16rpx;
        height: 16rpx;
        border-radius: 50%;
      }

      .legend-text {
        font-size: 24rpx;
        color: #666666;
      }
    }
  }
}
</style>
