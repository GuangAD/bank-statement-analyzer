<template>
  <div class="charts-panel">
    <!-- Tab 切换 -->
    <div class="chart-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- 图表内容 -->
    <div class="chart-content">
      <TrendChart v-if="activeTab === 'trend'" />
      <CategoryPie v-if="activeTab === 'category'" />
      <CompareBar v-if="activeTab === 'compare'" />
      <CalendarHeatmap v-if="activeTab === 'calendar'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import TrendChart from "./charts/TrendChart.vue";
import CategoryPie from "./charts/CategoryPie.vue";
import CompareBar from "./charts/CompareBar.vue";
import CalendarHeatmap from "./charts/CalendarHeatmap.vue";

const activeTab = ref("trend");

const tabs = [
  { id: "trend", label: "趋势图", icon: "📈" },
  { id: "category", label: "分类", icon: "🥧" },
  { id: "compare", label: "对比", icon: "📊" },
  { id: "calendar", label: "日历", icon: "📅" },
];
</script>

<style scoped>
.charts-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.chart-tabs {
  display: flex;
  gap: var(--spacing-sm);
  background: var(--card-bg);
  padding: var(--spacing-sm);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.chart-tabs button {
  flex: 1;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  transition: all var(--transition-fast);
}

.chart-tabs button:hover {
  background: var(--bg-color);
  color: var(--primary-color);
}

.chart-tabs button.active {
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--primary-dark)
  );
  color: white;
  box-shadow: var(--shadow-md);
}

.chart-content {
  min-height: 350px;
}

@media (max-width: 600px) {
  .chart-tabs button {
    padding: var(--spacing-sm);
    font-size: 0.875rem;
  }

  .chart-tabs button span:last-child {
    display: none;
  }
}
</style>
