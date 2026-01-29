<template>
  <div class="trend-chart">
    <div class="chart-header">
      <h4>收支趋势</h4>
      <div class="granularity-switch">
        <button
          v-for="option in granularityOptions"
          :key="option.value"
          :class="{ active: granularity === option.value }"
          @click="granularity = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import * as echarts from "echarts";
import { useTransactionStore } from "../../stores/transactionStore.js";
import dayjs from "dayjs";

const store = useTransactionStore();
const chartRef = ref(null);
let chartInstance = null;

const granularity = ref("day");
const granularityOptions = [
  { label: "按日", value: "day" },
  { label: "按周", value: "week" },
  { label: "按月", value: "month" },
];

// 按粒度聚合数据
const aggregatedData = computed(() => {
  const transactions = store.filteredTransactions;
  const stats = {};

  transactions.forEach((t) => {
    let key;
    const date = dayjs(t.date);

    if (granularity.value === "day") {
      key = date.format("YYYY-MM-DD");
    } else if (granularity.value === "week") {
      key = date.startOf("week").format("YYYY-MM-DD");
    } else {
      key = date.format("YYYY-MM");
    }

    if (!stats[key]) {
      stats[key] = { date: key, income: 0, expense: 0 };
    }

    if (t.type === "income") {
      stats[key].income += t.amount;
    } else {
      stats[key].expense += t.amount;
    }
  });

  return Object.values(stats).sort((a, b) => a.date.localeCompare(b.date));
});

function renderChart() {
  if (!chartRef.value || aggregatedData.value.length === 0) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const data = aggregatedData.value;
  const dates = data.map((d) => {
    if (granularity.value === "month") {
      return dayjs(d.date).format("YYYY年M月");
    } else if (granularity.value === "week") {
      return dayjs(d.date).format("M月D日") + "周";
    }
    return dayjs(d.date).format("M月D日");
  });
  const incomes = data.map((d) => d.income);
  const expenses = data.map((d) => d.expense);

  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      textStyle: { color: "#1a1a2e" },
      formatter: function (params) {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach((p) => {
          const color = p.seriesName === "收入" ? "#4CAF50" : "#EF5350";
          result += `<span style="color:${color}">● ${p.seriesName}</span>: ¥${p.value.toLocaleString()}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ["收入", "支出"],
      top: 0,
      right: 0,
      textStyle: { color: "#64748b" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: {
        color: "#64748b",
        rotate: dates.length > 10 ? 45 : 0,
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
      axisLabel: {
        color: "#64748b",
        formatter: (value) => (value >= 10000 ? value / 10000 + "万" : value),
      },
    },
    series: [
      {
        name: "收入",
        type: "line",
        data: incomes,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#4CAF50", width: 3 },
        itemStyle: { color: "#4CAF50" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(76, 175, 80, 0.3)" },
            { offset: 1, color: "rgba(76, 175, 80, 0)" },
          ]),
        },
      },
      {
        name: "支出",
        type: "line",
        data: expenses,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#EF5350", width: 3 },
        itemStyle: { color: "#EF5350" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(239, 83, 80, 0.3)" },
            { offset: 1, color: "rgba(239, 83, 80, 0)" },
          ]),
        },
      },
    ],
  };

  chartInstance.setOption(option);
}

// 监听数据变化
watch(
  [aggregatedData, granularity],
  () => {
    renderChart();
  },
  { deep: true },
);

// 响应窗口变化
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
.trend-chart {
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

.granularity-switch {
  display: flex;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.granularity-switch button {
  padding: 6px 12px;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.granularity-switch button.active {
  background: var(--primary-color);
  color: white;
}

.chart-container {
  height: 300px;
}
</style>
