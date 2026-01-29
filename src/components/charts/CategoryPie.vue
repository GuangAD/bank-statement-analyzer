<template>
  <div class="category-pie">
    <div class="chart-header">
      <h4>{{ type === "expense" ? "支出" : "收入" }}分类</h4>
      <div class="type-switch">
        <button
          :class="{ active: type === 'expense' }"
          @click="type = 'expense'"
        >
          支出
        </button>
        <button :class="{ active: type === 'income' }" @click="type = 'income'">
          收入
        </button>
      </div>
    </div>
    <div ref="chartRef" class="chart-container"></div>

    <!-- 分类图例 -->
    <div class="category-legend">
      <div
        v-for="item in topCategories"
        :key="item.categoryId"
        class="legend-item"
      >
        <span
          class="legend-color"
          :style="{ background: item.categoryInfo?.color }"
        ></span>
        <span class="legend-name"
          >{{ item.categoryInfo?.icon }} {{ item.categoryInfo?.name }}</span
        >
        <span class="legend-value"
          >¥{{
            formatAmount(type === "expense" ? item.expense : item.income)
          }}</span
        >
        <span class="legend-percent">{{ getPercent(item) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import * as echarts from "echarts";
import { useTransactionStore } from "../../stores/transactionStore.js";
import { formatAmount } from "../../utils/formatters.js";

const store = useTransactionStore();
const chartRef = ref(null);
let chartInstance = null;

const type = ref("expense");

// 获取分类统计
const categoryData = computed(() => {
  return store.categoryStats
    .filter((c) => (type.value === "expense" ? c.expense > 0 : c.income > 0))
    .sort((a, b) =>
      type.value === "expense" ? b.expense - a.expense : b.income - a.income,
    );
});

// Top 分类（用于图例）
const topCategories = computed(() => {
  return categoryData.value.slice(0, 8);
});

// 总金额
const total = computed(() => {
  return categoryData.value.reduce(
    (sum, c) => sum + (type.value === "expense" ? c.expense : c.income),
    0,
  );
});

function getPercent(item) {
  const value = type.value === "expense" ? item.expense : item.income;
  if (total.value === 0) return 0;
  return ((value / total.value) * 100).toFixed(1);
}

function renderChart() {
  if (!chartRef.value || categoryData.value.length === 0) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const data = categoryData.value.map((c) => ({
    name: c.categoryInfo?.name || "其他",
    value: type.value === "expense" ? c.expense : c.income,
    itemStyle: { color: c.categoryInfo?.color },
  }));

  const option = {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e2e8f0",
      textStyle: { color: "#1a1a2e" },
      formatter: function (params) {
        return `<strong>${params.name}</strong><br/>
                金额: ¥${params.value.toLocaleString()}<br/>
                占比: ${params.percent}%`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: "bold",
            formatter: function (params) {
              return `${params.name}\n¥${params.value.toLocaleString()}`;
            },
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.2)",
          },
        },
        labelLine: { show: false },
        data: data,
      },
    ],
  };

  chartInstance.setOption(option);
}

watch(
  [categoryData, type],
  () => {
    renderChart();
  },
  { deep: true },
);

function handleResize() {
  chartInstance?.resize();
}

onMounted(() => {
  renderChart();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  chartInstance?.dispose();
});
</script>

<style scoped>
.category-pie {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.chart-header h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.type-switch {
  display: flex;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.type-switch button {
  padding: 6px 12px;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
}

.type-switch button.active {
  background: var(--primary-color);
  color: white;
}

.chart-container {
  height: 250px;
}

.category-legend {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.8rem;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-value {
  font-weight: 500;
  color: var(--text-primary);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
}

.legend-percent {
  color: var(--text-muted);
  font-size: 0.7rem;
  min-width: 40px;
  text-align: right;
}

@media (max-width: 600px) {
  .category-legend {
    grid-template-columns: 1fr;
  }
}
</style>
