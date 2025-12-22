<template>
  <view class="ai-analysis-container">
    <!-- Navbar -->
    <wd-navbar
      title="AI智能分析"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      @click-left="goBack"
    />

    <scroll-view class="main-scroll" scroll-y>
      <view class="content-wrapper">
        <!-- Hero Section -->
        <view class="hero-banner premium-shadow">
          <view class="hero-bg-blobs">
            <view class="blob blob-1"></view>
            <view class="blob blob-2"></view>
          </view>
          <view class="hero-content">
            <view class="hero-text">
              <text class="title">AI 养育分析</text>
              <text class="subtitle">深度洞察宝宝的每日模式与成长趋势</text>
            </view>
            <view class="hero-badge">智慧枢纽</view>
          </view>
        </view>

        <!-- Active Analysis Card (If any) -->
        <view
          v-if="hasActiveAnalysis"
          class="analysis-status-card glass-card premium-shadow"
        >
          <view class="status-header">
            <view class="ai-chip">
              <view class="pulse-dot"></view>
              <text>AI 分析中...</text>
            </view>
            <text class="progress-num">{{ Math.round(progressPercent) }}%</text>
          </view>
          <view class="status-body">
            <text class="status-main">{{ getAnalysisStatusText() }}</text>
            <text class="status-sub">{{ getAnalysisSubText() }}</text>
            <view class="premium-progress-bar">
              <view
                class="fill"
                :style="{ width: progressPercent + '%' }"
              ></view>
            </view>
          </view>
        </view>

        <!-- Daily Tips masonry-style horizontal scroll -->
        <view class="section-container">
          <view class="section-head">
            <text class="title">今日建议</text>
            <view
              class="refresh-action"
              :class="{ rotating: isLoadingTips }"
              @click="refreshDailyTips"
            >
              <wd-icon name="refresh" size="18" />
            </view>
          </view>

          <scroll-view scroll-x class="tips-scroll-h" show-scrollbar="false">
            <view class="tips-track">
              <view
                v-for="(tip, idx) in todayTips"
                :key="tip.id || idx"
                class="tip-premium-item glass-card"
                @click="handleTipClick(tip)"
              >
                <view
                  class="tip-icon-box"
                  :style="{ background: getTipBg(tip.type) }"
                >
                  <text class="icon-emoji">{{ tip.icon }}</text>
                </view>
                <view class="tip-main">
                  <text class="tip-title">{{ tip.title }}</text>
                  <text class="tip-desc">{{ tip.description }}</text>
                </view>
                <view class="tip-footer">
                  <wd-tag :type="getPriorityTag(tip.priority)" size="small">{{
                    getPriorityText(tip.priority)
                  }}</wd-tag>
                  <text class="more-link"
                    >了解更多 <wd-icon name="arrow-right" size="12"
                  /></text>
                </view>
              </view>

              <view
                v-if="!todayTips.length && !isLoadingTips"
                class="empty-tips-spot"
              >
                <text class="emoji">✨</text>
                <text>点击刷新获取AI独家建议</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- Alerts Section -->
        <view v-if="attentionItems.length" class="section-container">
          <view class="section-head">
            <text class="title">健康关注</text>
          </view>
          <view class="alert-premium-list">
            <view
              v-for="(alert, idx) in attentionItems"
              :key="idx"
              class="alert-premium-card"
              :class="alert.level"
              @click="handleAlertClick(alert)"
            >
              <view class="alert-icon">{{ getAlertIcon(alert.level) }}</view>
              <view class="alert-body">
                <text class="atitle">{{ alert.title }}</text>
                <text class="adesc">{{ alert.description }}</text>
              </view>
              <wd-icon name="arrow-right" size="14" color="#999" />
            </view>
          </view>
        </view>

        <!-- Main Analysis Results -->
        <view class="section-container">
          <view class="section-head">
            <text class="title">分析报告</text>
            <wd-button
              size="small"
              plain
              round
              :loading="isAnalyzing"
              @click="handleBatchAnalyze"
              >全量分析</wd-button
            >
          </view>

          <view
            v-for="atype in analysisTypes"
            :key="atype.type"
            class="report-block"
          >
            <view class="type-pill-bar">
              <view class="l">
                <text class="e">{{ atype.icon }}</text>
                <text class="n">{{ atype.name }}</text>
              </view>
              <view class="r">
                <wd-button
                  v-if="!getLatestAnalysis(atype.type)"
                  size="mini"
                  type="primary"
                  @click="analyzeType(atype.type)"
                  >开始分析</wd-button
                >
                <text v-else class="update-time">最后更新: 刚刚</text>
              </view>
            </view>

            <view v-if="getLatestAnalysis(atype.type)" class="report-content">
              <!-- Score Visualization -->
              <view class="score-hero glass-card">
                <view class="score-circle-box">
                  <text class="score-val">{{
                    getLatestAnalysis(atype.type)?.score || 0
                  }}</text>
                  <text class="score-unit">分</text>
                </view>
                <view class="score-rank">
                  <text class="rank-name">{{
                    getScoreLevel(getLatestAnalysis(atype.type)?.score || 0)
                  }}</text>
                  <text class="rank-desc">优于 85% 的同龄宝宝</text>
                </view>
              </view>

              <!-- Patterns & Charts -->
              <view class="pattern-matrix">
                <view
                  v-for="detail in getAnalysisDetails(atype.type)"
                  :key="detail.type"
                  class="pattern-chip"
                >
                  <text class="p-name">{{ detail.name }}</text>
                  <text class="p-val">{{ detail.score }}</text>
                </view>
              </view>

              <!-- Chart -->
              <view
                v-if="getChartData(atype.type)"
                class="chart-box premium-shadow"
              >
                <UChart
                  :canvas-id="`chart-${atype.type}`"
                  :chart-data="convertToChartData(getChartData(atype.type))"
                  :chart-type="getChartType(atype.type)"
                  height="340rpx"
                />
              </view>

              <!-- Insight Pills -->
              <view
                v-if="getLatestAnalysis(atype.type)?.insights?.length"
                class="insights-grid"
              >
                <view
                  v-for="(insight, idx) in getLatestAnalysis(
                    atype.type,
                  )?.insights?.slice(0, 2)"
                  :key="idx"
                  class="insight-bubble"
                  @click="handleInsightAction(parseInsight(insight))"
                >
                  <text class="i-icon">💡</text>
                  <text class="i-text">{{ parseInsight(insight).title }}</text>
                </view>
              </view>
            </view>

            <view v-else class="empty-analysis-card glass-card">
              <image
                src="/static/ai-placeholder.svg"
                mode="aspectFit"
                class="pl-img"
              />
              <text>尚未生成{{ atype.name }}报告</text>
            </view>
          </view>
        </view>

        <!-- Stats Matrix -->
        <view v-if="analysisStats" class="section-container">
          <view class="section-head">
            <text class="title">统计看板</text>
          </view>
          <view class="stats-matrix-grid">
            <view class="stat-card">
              <text class="label">累计分析</text>
              <text class="value">{{ analysisStats.total_analyses }}</text>
            </view>
            <view class="stat-card">
              <text class="label">完成率</text>
              <text class="value"
                >{{
                  Math.round(
                    (analysisStats.completed_analyses /
                      (analysisStats.total_analyses || 1)) *
                      100,
                  )
                }}%</text
              >
            </view>
            <view class="stat-card">
              <text class="label">综合均分</text>
              <text class="value">{{
                formatScore(analysisStats.average_score)
              }}</text>
            </view>
            <view class="stat-card">
              <text class="label">AI 建议</text>
              <text class="value">{{ todayTips.length }}条</text>
            </view>
          </view>
        </view>

        <view class="safe-bottom-padding"></view>
      </view>
    </scroll-view>

    <!-- Tip Detail Popup -->
    <wd-popup
      v-model="showTipDetail"
      position="bottom"
      round
      safe-area-inset-bottom
    >
      <view class="premium-popup-content">
        <view class="popup-header">
          <view class="pop-icon-box">
            <text class="emoji">{{ selectedTip?.icon }}</text>
          </view>
          <text class="pop-title">{{ selectedTip?.title }}</text>
          <view class="close-bar" @click="closeTipDetail"></view>
        </view>
        <scroll-view scroll-y class="pop-body">
          <text class="tip-content-text">{{ selectedTip?.description }}</text>
          <view class="tip-meta-info">
            <view class="meta-row">
              <text class="label">推荐程度</text>
              <wd-tag :type="getPriorityTag(selectedTip?.priority)" plain>{{
                getPriorityText(selectedTip?.priority)
              }}</wd-tag>
            </view>
            <view class="meta-row">
              <text class="label">建议方案</text>
              <text class="val">AI 生成个性化建议</text>
            </view>
          </view>
        </scroll-view>
        <view class="popup-footer">
          <wd-button
            block
            round
            type="primary"
            size="large"
            @click="closeTipDetail"
            >我知道了</wd-button
          >
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onShow, onHide } from "@dcloudio/uni-app";
import { currentBaby } from "@/store/baby";
import { useAIStore } from "@/store/ai";
import UChart from "@/components/UChart.vue";
import type {
  AIAnalysisType,
  AIInsight,
  AIAlert,
  DailyTip,
  AnalysisStatsResponse,
  AIChartData,
} from "@/types/ai";
import { getAnalysisChartData } from "@/api/ai";
import { goBack } from "@/utils/common";

const aiStore = useAIStore();

// 状态
const isAnalyzing = ref(false);
const showTipDetail = ref(false);
const selectedTip = ref<DailyTip | null>(null);
const analysisStats = ref<AnalysisStatsResponse | null>(null);
const progressPercent = ref(0);
const progressTimer = ref<number | null>(null);
const isLoadingTips = ref(false);

const analysisTypes = [
  { type: "feeding" as AIAnalysisType, name: "喂养分析", icon: "🍼" },
];

const todayTips = computed(() => aiStore.todayTips.value || []);
const hasActiveAnalysis = computed(() => aiStore.hasActiveAnalysis.value);
const analyzingCount = computed(() => aiStore.analyzingIds.size);

const attentionItems = computed<AIAlert[]>(() => {
  if (!currentBaby.value || !currentBaby.value.babyId) return [];
  const items = aiStore.getAttentionItems(currentBaby.value.babyId);
  return items.map((item) => ({
    level: item.level as "critical" | "warning" | "info",
    type: item.type,
    title: item.title,
    description: item.description,
    suggestion: "",
    timestamp: new Date().toISOString(),
  }));
});

const getLatestAnalysis = (type: AIAnalysisType) => {
  if (!currentBaby.value) return null;
  return aiStore.getLatestAnalysisByType(type);
};

const getScoreLevel = (score: number) => {
  if (score >= 90) return "卓越";
  if (score >= 80) return "优秀";
  if (score >= 70) return "良好";
  return "待优化";
};

const getAnalysisDetails = (type: AIAnalysisType) => {
  const analysis = getLatestAnalysis(type);
  if (!analysis || !analysis.result) return [];

  const result = analysis.result;
  const details: Array<{ type: string; name: string; score: number }> = [];

  if (result.patterns && result.patterns.length > 0) {
    result.patterns.forEach((pattern) => {
      const confidence = Math.round((pattern.confidence || 0) * 100);
      const typeNameMap: Record<string, string> = {
        regularity: "规律性",
        adequacy: "适量性",
        timeliness: "及时性",
        diversity: "多样性",
      };
      const name = typeNameMap[pattern.pattern_type] || pattern.pattern_type;
      details.push({ type: pattern.pattern_type, name, score: confidence });
    });
  }

  if (details.length === 0 && type === "feeding") {
    return [
      {
        type: "regularity",
        name: "规律性",
        score: Math.round((result.score || 0) * 0.9),
      },
      {
        type: "adequacy",
        name: "适量性",
        score: Math.round((result.score || 0) * 0.95),
      },
      {
        type: "timeliness",
        name: "及时性",
        score: Math.round((result.score || 0) * 0.85),
      },
    ];
  }
  return details;
};

const getChartData = (type: AIAnalysisType): AIChartData | null => {
  const analysis = getLatestAnalysis(type);
  if (!analysis || !analysis.result) return null;
  return getAnalysisChartData(type, analysis.result);
};

const getChartType = (type: AIAnalysisType) =>
  type === "feeding" ? "radar" : "line";

const parseInsight = (insightStr: string): AIInsight => {
  try {
    return JSON.parse(insightStr);
  } catch {
    return {
      type: "general",
      title: "洞察结论",
      description: insightStr,
      priority: "medium",
      category: "通用",
    };
  }
};

const getTipBg = (type: string) => {
  const map: Record<string, string> = {
    feeding: "#E6F7FF",
    sleep: "#F6FFED",
    health: "#FFF7E6",
  };
  return map[type] || "#F0F0F0";
};

const getPriorityTag = (p?: string) => {
  if (p === "high") return "danger";
  if (p === "medium") return "warning";
  return "success";
};

const getPriorityText = (p?: string) => {
  if (p === "high") return "高优";
  if (p === "medium") return "中等";
  return "建议";
};

const formatScore = (score?: number) => score?.toFixed(1) || "0.0";

const getAnalysisStatusText = () => {
  const count = analyzingCount.value;
  return count > 1 ? `深度学习 ${count} 项指标...` : "深度分析中...";
};

const getAnalysisSubText = () => {
  const percent = Math.round(progressPercent.value);
  if (percent < 30) return "正在提取历史数据...";
  if (percent < 70) return "AI 正在识别模式...";
  return "报告生成中...";
};

const startProgressSimulation = () => {
  progressPercent.value = 0;
  if (progressTimer.value) clearInterval(progressTimer.value);
  progressTimer.value = setInterval(() => {
    if (progressPercent.value < 92) progressPercent.value += 1.5;
  }, 1000) as any;
};

const stopProgressSimulation = () => {
  if (progressTimer.value) {
    clearInterval(progressTimer.value);
    progressTimer.value = null;
  }
  progressPercent.value = 100;
  setTimeout(() => (progressPercent.value = 0), 2000);
};

const handleBatchAnalyze = async () => {
  if (!currentBaby.value?.babyId || isAnalyzing.value) return;
  const babyId = currentBaby.value?.babyId;
  if (!babyId) return;
  try {
    isAnalyzing.value = true;
    const startDate =
      new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0] || "";
    const endDate = new Date().toISOString().split("T")[0] || "";
    const response = await aiStore.batchAnalyze(babyId, startDate, endDate);
    if (response) {
      response.analyses.forEach((analysis) => {
        if (!analysis.analysis_id) return;
        aiStore.startPolling(analysis.analysis_id, (status, progress) => {
          if (progress !== undefined)
            progressPercent.value = Math.max(progressPercent.value, progress);
          if (status === "completed" || status === "failed") {
            // Check all done logic simplified here
          }
        });
      });
    }
  } catch (e) {
    stopProgressSimulation();
  } finally {
    isAnalyzing.value = false;
  }
};

const analyzeType = async (type: AIAnalysisType) => {
  if (!currentBaby.value?.babyId) return;
  try {
    const startDate =
      new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0] || "";
    const endDate = new Date().toISOString().split("T")[0] || "";
    const analysis = await aiStore.createAnalysis(
      currentBaby.value.babyId,
      type,
      startDate,
      endDate,
    );
    if (analysis) {
      aiStore.startPolling(analysis.id, (status) => {
        if (status === "completed") loadAllData();
      });
    }
  } catch (e) {}
};

const refreshDailyTips = async () => {
  if (!currentBaby.value?.babyId || isLoadingTips.value) return;
  try {
    isLoadingTips.value = true;
    const today = new Date().toISOString().split("T")[0];
    aiStore.clearDailyTipsCache(today);
    await aiStore.generateDailyTips(parseInt(currentBaby.value.babyId));
    uni.showToast({ title: "已更新", icon: "success" });
  } catch (e) {
  } finally {
    isLoadingTips.value = false;
  }
};

const handleTipClick = (tip: DailyTip) => {
  selectedTip.value = tip;
  showTipDetail.value = true;
};
const closeTipDetail = () => {
  showTipDetail.value = false;
  selectedTip.value = null;
};
const handleAlertClick = (alert: any) => {
  uni.showModal({
    title: alert.title,
    content: alert.description,
    showCancel: false,
    confirmText: "知道了",
  });
};
const handleInsightAction = (insight: AIInsight) => {
  uni.showModal({
    title: insight.title,
    content: insight.description,
    showCancel: false,
    confirmText: "知道了",
  });
};

const convertToChartData = (aiChartData: AIChartData | null) => {
  if (!aiChartData) return { categories: [], series: [] };
  return {
    categories: aiChartData.categories || [],
    series: aiChartData.series.map((s) => ({ name: s.name, data: s.data })),
  };
};

const loadAllData = async () => {
  if (!currentBaby.value?.babyId) return;
  const bid = currentBaby.value.babyId;
  try {
    analysisStats.value = await aiStore.getAnalysisStats(parseInt(bid));
    await aiStore.getDailyTips(parseInt(bid));
    for (const atype of analysisTypes)
      await aiStore.getLatestAnalysis(parseInt(bid), atype.type);
  } catch (e) {}
};

onMounted(() => {
  if (aiStore.hasActiveAnalysis.value) startProgressSimulation();
  loadAllData();
});

onShow(() => {
  aiStore.setBackgroundPolling(true);
});
onUnmounted(() => stopProgressSimulation());

const getAlertIcon = (level: string) => (level === "critical" ? "🚨" : "⚠️");
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.ai-analysis-container {
  min-height: 100vh;
  background: $color-bg-secondary;
}

.content-wrapper {
  padding: 32rpx;
}

.hero-banner {
  height: 280rpx;
  background: linear-gradient(
    135deg,
    $color-primary-dark 0%,
    $color-primary 100%
  );
  border-radius: $radius-xl;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 48rpx;
  margin-bottom: 40rpx;

  .hero-bg-blobs {
    position: absolute;
    inset: 0;
    .blob {
      position: absolute;
      background: rgba(255, 255, 255, 0.15);
      filter: blur(40px);
      border-radius: 50%;
    }
    .blob-1 {
      width: 300rpx;
      height: 300rpx;
      top: -100rpx;
      left: -50rpx;
    }
    .blob-2 {
      width: 200rpx;
      height: 200rpx;
      bottom: -50rpx;
      right: -50rpx;
    }
  }

  .hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .hero-text {
      .title {
        font-size: 44rpx;
        font-weight: 800;
        color: #fff;
        display: block;
        margin-bottom: 8rpx;
      }
      .subtitle {
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.8);
      }
    }
    .hero-badge {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      padding: 12rpx 24rpx;
      border-radius: 100rpx;
      font-size: 22rpx;
      color: #fff;
      font-weight: 700;
      border: 1rpx solid rgba(255, 255, 255, 0.3);
    }
  }
}

.analysis-status-card {
  padding: 32rpx;
  margin-bottom: 40rpx;
  border-radius: $radius-lg;

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;

    .ai-chip {
      display: flex;
      align-items: center;
      gap: 12rpx;
      background: $color-primary-lighter;
      padding: 8rpx 20rpx;
      border-radius: 100rpx;
      .pulse-dot {
        width: 12rpx;
        height: 12rpx;
        border-radius: 50%;
        background: $color-primary;
        animation: dotPulse 1.5s infinite;
      }
      text {
        font-size: 22rpx;
        font-weight: 800;
        color: $color-primary-dark;
      }
    }
    .progress-num {
      font-size: 28rpx;
      font-weight: 900;
      color: $color-primary-dark;
    }
  }

  .status-body {
    .status-main {
      font-size: 32rpx;
      font-weight: 800;
      color: $color-text-primary;
      display: block;
      margin-bottom: 4rpx;
    }
    .status-sub {
      font-size: 24rpx;
      color: $color-text-tertiary;
      display: block;
      margin-bottom: 24rpx;
    }

    .premium-progress-bar {
      height: 12rpx;
      background: $color-bg-secondary;
      border-radius: 10rpx;
      overflow: hidden;
      .fill {
        height: 100%;
        background: linear-gradient(
          90deg,
          $color-primary 0%,
          $color-primary-dark 100%
        );
        transition: width 0.3s;
      }
    }
  }
}

@keyframes dotPulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 1;
  }
}

.section-container {
  margin-bottom: 48rpx;
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    padding: 0 8rpx;
    .title {
      font-size: 34rpx;
      font-weight: 800;
      color: $color-text-primary;
    }
    .refresh-action {
      padding: 12rpx;
      color: $color-primary;
      &.rotating {
        animation: spin 1s linear infinite;
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.tips-scroll-h {
  width: 100%;
  .tips-track {
    display: flex;
    padding-bottom: 16rpx;
    gap: 24rpx;
  }
}

.tip-premium-item {
  width: 520rpx;
  flex-shrink: 0;
  padding: 32rpx;
  border-radius: $radius-lg;
  display: flex;
  flex-direction: column;
  gap: 24rpx;

  .tip-icon-box {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    .icon-emoji {
      font-size: 40rpx;
    }
  }

  .tip-main {
    .tip-title {
      font-size: 30rpx;
      font-weight: 800;
      color: $color-text-primary;
      display: block;
      margin-bottom: 8rpx;
    }
    .tip-desc {
      font-size: 24rpx;
      color: $color-text-secondary;
      line-height: 1.5;
      height: 72rpx;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  .tip-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .more-link {
      font-size: 22rpx;
      font-weight: 700;
      color: $color-primary;
      display: flex;
      align-items: center;
      gap: 4rpx;
    }
  }
}

.empty-tips-spot {
  width: 100%;
  height: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $color-text-tertiary;
  font-size: 26rpx;
  .emoji {
    font-size: 48rpx;
    margin-bottom: 12rpx;
    display: block;
  }
}

.alert-premium-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.alert-premium-card {
  background: #fff;
  border-radius: $radius-md;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-left: 10rpx solid transparent;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);

  &.critical {
    border-left-color: $color-danger;
    background: #fff5f5;
  }
  &.warning {
    border-left-color: $color-warning;
    background: #fffaf1;
  }

  .alert-icon {
    font-size: 36rpx;
  }
  .alert-body {
    flex: 1;
    .atitle {
      font-size: 26rpx;
      font-weight: 800;
      color: $color-text-primary;
      display: block;
    }
    .adesc {
      font-size: 22rpx;
      color: $color-text-secondary;
    }
  }
}

.report-block {
  margin-bottom: 40rpx;
}

.type-pill-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16rpx 24rpx;
  border-radius: 100rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);

  .l {
    display: flex;
    align-items: center;
    gap: 12rpx;
    .e {
      font-size: 32rpx;
    }
    .n {
      font-size: 26rpx;
      font-weight: 800;
      color: $color-text-primary;
    }
  }
  .r {
    .update-time {
      font-size: 20rpx;
      color: $color-text-tertiary;
    }
  }
}

.score-hero {
  flex-direction: row;
  padding: 40rpx;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  gap: 40rpx;
  margin-bottom: 24rpx;

  .score-circle-box {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    background: $color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 8rpx solid $color-primary-lighter;
    .score-val {
      font-size: 48rpx;
      font-weight: 900;
    }
    .score-unit {
      font-size: 20rpx;
      margin-top: 12rpx;
      margin-left: 2rpx;
      opacity: 0.8;
    }
  }

  .score-rank {
    .rank-name {
      font-size: 34rpx;
      font-weight: 800;
      color: $color-text-primary;
      display: block;
    }
    .rank-desc {
      font-size: 22rpx;
      color: $color-text-tertiary;
    }
  }
}

.pattern-matrix {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;

  .pattern-chip {
    background: #fff;
    padding: 16rpx 24rpx;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    gap: 12rpx;
    box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.02);
    .p-name {
      font-size: 22rpx;
      font-weight: 700;
      color: $color-text-secondary;
    }
    .p-val {
      font-size: 24rpx;
      font-weight: 800;
      color: $color-primary-dark;
    }
  }
}

.chart-box {
  background: #fff;
  border-radius: $radius-lg;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.insights-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .insight-bubble {
    background: #f0f9ff;
    padding: 24rpx 32rpx;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    gap: 16rpx;
    .i-icon {
      font-size: 32rpx;
    }
    .i-text {
      font-size: 24rpx;
      font-weight: 700;
      color: #1890ff;
    }
  }
}

.empty-analysis-card {
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  border-radius: $radius-lg;
  color: $color-text-tertiary;
  font-size: 26rpx;
  .pl-img {
    width: 160rpx;
    height: 160rpx;
    opacity: 0.5;
  }
}

.stats-matrix-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;

  .stat-card {
    background: #fff;
    padding: 32rpx;
    border-radius: $radius-lg;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
    .label {
      font-size: 22rpx;
      color: $color-text-tertiary;
      font-weight: 700;
    }
    .value {
      font-size: 36rpx;
      font-weight: 900;
      color: $color-text-primary;
      font-family: "Outfit";
    }
  }
}

.safe-bottom-padding {
  height: calc(120rpx + env(safe-area-inset-bottom));
}

.premium-popup-content {
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 40rpx 48rpx;
  max-height: 80vh;
  display: flex;
  flex-direction: column;

  .popup-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    margin-bottom: 48rpx;
    position: relative;

    .pop-icon-box {
      width: 120rpx;
      height: 120rpx;
      background: $color-primary-lighter;
      border-radius: 40rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      .emoji {
        font-size: 60rpx;
      }
    }
    .pop-title {
      font-size: 36rpx;
      font-weight: 800;
      color: $color-text-primary;
    }
    .close-bar {
      width: 80rpx;
      height: 10rpx;
      background: $color-divider;
      border-radius: 10rpx;
      position: absolute;
      top: -10rpx;
      left: 50%;
      transform: translateX(-50%);
    }
  }

  .pop-body {
    flex: 1;
    overflow: hidden;
    .tip-content-text {
      font-size: 30rpx;
      color: $color-text-secondary;
      line-height: 1.8;
      display: block;
      margin-bottom: 48rpx;
    }

    .tip-meta-info {
      background: $color-bg-secondary;
      padding: 32rpx;
      border-radius: $radius-md;
      display: flex;
      flex-direction: column;
      gap: 24rpx;
      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        .label {
          font-size: 24rpx;
          font-weight: 700;
          color: $color-text-tertiary;
        }
        .val {
          font-size: 24rpx;
          font-weight: 700;
          color: $color-text-primary;
        }
      }
    }
  }

  .popup-footer {
    margin-top: 48rpx;
  }
}
</style>
