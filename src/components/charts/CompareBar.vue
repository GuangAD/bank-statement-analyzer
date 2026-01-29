<template>
  <div class="compare-bar">
    <div class="chart-header">
      <h4>月度收支对比</h4>
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

const monthlyData = computed(() => store.monthlyStats);

function renderChart() {
  if (!chartRef.value || monthlyData.value.length === 0) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const data = monthlyData.value;
  const months = data.map((d) => dayjs(d.month).format("YYYY年M月"));
  const incomes = data.map((d) => d.income);
  const expenses = data.map((d) => d.expense);
  const balances = data.map((d) => d.income - d.expense);

  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e2e8f0",
      textStyle: { color: "#1a1a2e" },
      formatter: function (params) {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach((p) => {
          if (p.seriesName === "结余") return;
          const color = p.seriesName === "收入" ? "#4CAF50" : "#EF5350";
          result += `<span style="color:${color}">● ${p.seriesName}</span>: ¥${p.value.toLocaleString()}<br/>`;
        });
        const balance = params[0].data - params[1].data;
        const balanceColor = balance >= 0 ? "#4CAF50" : "#EF5350";
        result += `<span style="color:${balanceColor}">● 结余</span>: ¥${balance.toLocaleString()}`;
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
      bottom: "10%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: months,
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: {
        color: "#64748b",
        rotate: months.length > 6 ? 30 : 0,
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
        type: "bar",
        data: incomes,
        barWidth: "35%",
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#81C784" },
            { offset: 1, color: "#4CAF50" },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: months.length <= 6,
          position: "top",
          color: "#4CAF50",
          fontSize: 10,
          formatter: (params) =>
            params.value >= 10000
              ? (params.value / 10000).toFixed(1) + "万"
              : "",
        },
      },
      {
        name: "支出",
        type: "bar",
        data: expenses,
        barWidth: "35%",
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#E57373" },
            { offset: 1, color: "#EF5350" },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: months.length <= 6,
          position: "top",
          color: "#EF5350",
          fontSize: 10,
          formatter: (params) =>
            params.value >= 10000
              ? (params.value / 10000).toFixed(1) + "万"
              : "",
        },
      },
      {
        name: "结余",
        type: "line",
        data: balances,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { color: "#2196F3", width: 2 },
        itemStyle: {
          color: "#2196F3",
          borderWidth: 2,
          borderColor: "#fff",
        },
        label: {
          show: months.length <= 4,
          position: "top",
          color: "#2196F3",
          fontSize: 10,
          formatter: (params) => {
            const prefix = params.value >= 0 ? "+" : "";
            if (Math.abs(params.value) >= 10000) {
              return prefix + (params.value / 10000).toFixed(1) + "万";
            }
            return prefix + params.value.toLocaleString();
          },
        },
      },
    ],
  };

  chartInstance.setOption(option);
}

watch(
  monthlyData,
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
.compare-bar {
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

.chart-container {
  height: 300px;
}
</style>
