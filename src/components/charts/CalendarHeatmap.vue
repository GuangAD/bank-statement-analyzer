<template>
  <div class="calendar-heatmap">
    <div class="chart-header">
      <h4>交易日历</h4>
      <div class="year-nav">
        <button @click="prevYear">◀</button>
        <span>{{ currentYear }}年</span>
        <button @click="nextYear">▶</button>
      </div>
    </div>
    <div ref="chartRef" class="chart-container"></div>
    <div class="legend">
      <span class="legend-label">少</span>
      <div class="legend-scale">
        <span
          v-for="i in 5"
          :key="i"
          class="scale-block"
          :style="{ background: getScaleColor(i) }"
        ></span>
      </div>
      <span class="legend-label">多</span>
    </div>
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

const currentYear = ref(dayjs().year());

// 获取当年的每日统计
const yearlyData = computed(() => {
  const year = currentYear.value;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  return store.dailyStats.filter(
    (d) => d.date >= startDate && d.date <= endDate,
  );
});

// 获取最大值用于颜色缩放
const maxValue = computed(() => {
  if (yearlyData.value.length === 0) return 1;
  return Math.max(...yearlyData.value.map((d) => d.income + d.expense));
});

function getScaleColor(level) {
  const colors = ["#e8f5e9", "#a5d6a7", "#66bb6a", "#43a047", "#2e7d32"];
  return colors[level - 1];
}

function prevYear() {
  currentYear.value--;
}

function nextYear() {
  if (currentYear.value < dayjs().year()) {
    currentYear.value++;
  }
}

function renderChart() {
  if (!chartRef.value) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const year = currentYear.value;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // 构建热力图数据
  const data = yearlyData.value.map((d) => {
    const total = d.income + d.expense;
    return [d.date, total];
  });

  const option = {
    tooltip: {
      formatter: function (params) {
        const date = params.value[0];
        const total = params.value[1];
        const dayData = yearlyData.value.find((d) => d.date === date);

        if (!dayData) {
          return `${dayjs(date).format("YYYY年M月D日")}<br/>无交易`;
        }

        return `<strong>${dayjs(date).format("YYYY年M月D日")}</strong><br/>
                收入: ¥${dayData.income.toLocaleString()}<br/>
                支出: ¥${dayData.expense.toLocaleString()}<br/>
                交易数: ${dayData.count}笔`;
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: maxValue.value,
      inRange: {
        color: ["#f1f5f9", "#c8e6c9", "#81c784", "#4caf50", "#2e7d32"],
      },
    },
    calendar: {
      top: 50,
      left: 30,
      right: 30,
      bottom: 20,
      cellSize: ["auto", 15],
      range: [startDate, endDate],
      itemStyle: {
        borderWidth: 2,
        borderColor: "#fff",
      },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 1,
        nameMap: ["日", "一", "二", "三", "四", "五", "六"],
        color: "#64748b",
        fontSize: 10,
      },
      monthLabel: {
        nameMap: "cn",
        color: "#64748b",
        fontSize: 10,
      },
      splitLine: { show: false },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 5,
            shadowColor: "rgba(0, 0, 0, 0.3)",
          },
        },
      },
    ],
  };

  chartInstance.setOption(option);
}

watch(
  [yearlyData, currentYear],
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
.calendar-heatmap {
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

.year-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.year-nav button {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--bg-color);
  color: var(--text-secondary);
  font-size: 10px;
}

.year-nav button:hover {
  background: var(--primary-color);
  color: white;
}

.year-nav span {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 60px;
  text-align: center;
}

.chart-container {
  height: 180px;
}

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.legend-label {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.legend-scale {
  display: flex;
  gap: 2px;
}

.scale-block {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
</style>
