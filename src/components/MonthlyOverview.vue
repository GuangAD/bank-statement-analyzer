<template>
  <div class="monthly-overview">
    <div class="section-header">
      <h3>📅 月度收支看板</h3>
      <span class="section-hint">点击卡片可筛选该月交易</span>
    </div>

    <div class="months-grid">
      <div
        v-for="month in monthlyData"
        :key="month.month"
        class="month-card"
        :class="{
          'is-active': isActiveMonth(month.month),
          'is-surplus': month.income > month.expense,
          'is-deficit': month.income < month.expense,
        }"
        @click="selectMonth(month)"
      >
        <div class="month-header">
          <span class="month-label">{{ formatMonthLabel(month.month) }}</span>
          <span
            class="month-badge"
            :class="month.income >= month.expense ? 'surplus' : 'deficit'"
          >
            {{ month.income >= month.expense ? "盈余" : "超支" }}
          </span>
        </div>

        <div class="month-stats">
          <div class="stat-row income">
            <span class="stat-icon">↑</span>
            <span class="stat-label">收入</span>
            <span class="stat-value">{{ formatAmount(month.income) }}</span>
          </div>
          <div class="stat-row expense">
            <span class="stat-icon">↓</span>
            <span class="stat-label">支出</span>
            <span class="stat-value">{{ formatAmount(month.expense) }}</span>
          </div>
          <div class="stat-row balance">
            <span class="stat-icon">=</span>
            <span class="stat-label">结余</span>
            <span
              class="stat-value"
              :class="
                month.income >= month.expense ? 'text-income' : 'text-expense'
              "
            >
              {{ month.income >= month.expense ? "+" : ""
              }}{{ formatAmount(month.income - month.expense) }}
            </span>
          </div>
        </div>

        <div class="month-bar">
          <div
            class="bar-income"
            :style="{ width: getBarWidth(month.income, month) + '%' }"
          ></div>
          <div
            class="bar-expense"
            :style="{ width: getBarWidth(month.expense, month) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 清除筛选按钮 -->
    <div class="clear-filter" v-if="hasMonthFilter">
      <button class="btn-secondary" @click="clearMonthFilter">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        清除月份筛选，查看全部
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useTransactionStore } from "../stores/transactionStore.js";
import dayjs from "dayjs";

const store = useTransactionStore();

// 获取月度统计数据（基于原始数据，不受筛选影响）
const monthlyData = computed(() => {
  const stats = {};

  store.rawTransactions.forEach((t) => {
    const month = dayjs(t.date).format("YYYY-MM");
    if (!stats[month]) {
      stats[month] = { month, income: 0, expense: 0, count: 0 };
    }

    stats[month].count++;
    if (t.type === "income") {
      stats[month].income += t.amount;
    } else {
      stats[month].expense += t.amount;
    }
  });

  return Object.values(stats).sort((a, b) => b.month.localeCompare(a.month));
});

// 当前是否有月份筛选
const hasMonthFilter = computed(() => {
  return (
    store.filters.dateRange[0] !== null || store.filters.dateRange[1] !== null
  );
});

// 判断是否为当前选中的月份
function isActiveMonth(month) {
  if (!store.filters.dateRange[0] || !store.filters.dateRange[1]) return false;

  const startMonth = dayjs(store.filters.dateRange[0]).format("YYYY-MM");
  const endMonth = dayjs(store.filters.dateRange[1]).format("YYYY-MM");

  return startMonth === month && endMonth === month;
}

// 选择月份，更新筛选条件
function selectMonth(month) {
  const startDate = dayjs(month.month).startOf("month").format("YYYY-MM-DD");
  const endDate = dayjs(month.month).endOf("month").format("YYYY-MM-DD");

  store.setFilters({
    dateRange: [startDate, endDate],
  });
}

// 清除月份筛选
function clearMonthFilter() {
  store.setFilters({
    dateRange: [null, null],
  });
}

// 格式化月份标签
function formatMonthLabel(month) {
  return dayjs(month).format("YYYY年M月");
}

// 格式化金额 - 显示完整数字，不简写
function formatAmount(amount) {
  return (
    "¥" +
    amount.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// 计算柱状条宽度
function getBarWidth(value, month) {
  const max = Math.max(month.income, month.expense);
  if (max === 0) return 0;
  return (value / max) * 100;
}
</script>

<style scoped>
.monthly-overview {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.section-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-md);
}

.month-card {
  background: var(--bg-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 2px solid transparent;
}

.month-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

.month-card.is-active {
  border-color: var(--primary-color);
  background: rgba(25, 118, 210, 0.05);
}

.month-card.is-surplus .month-header {
  border-left: 3px solid var(--income-color);
  padding-left: var(--spacing-sm);
}

.month-card.is-deficit .month-header {
  border-left: 3px solid var(--expense-color);
  padding-left: var(--spacing-sm);
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.month-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.month-badge {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.month-badge.surplus {
  background: var(--income-bg);
  color: var(--income-color);
}

.month-badge.deficit {
  background: var(--expense-bg);
  color: var(--expense-color);
}

.month-stats {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.stat-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.8rem;
}

.stat-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
}

.stat-row.income .stat-icon {
  background: var(--income-bg);
  color: var(--income-color);
}

.stat-row.expense .stat-icon {
  background: var(--expense-bg);
  color: var(--expense-color);
}

.stat-row.balance .stat-icon {
  background: var(--balance-bg);
  color: var(--balance-color);
}

.stat-label {
  color: var(--text-secondary);
  flex: 1;
}

.stat-value {
  font-weight: 600;
  font-family: "JetBrains Mono", monospace;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.month-bar {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bar-income,
.bar-expense {
  height: 4px;
  border-radius: 2px;
  transition: width var(--transition-base);
}

.bar-income {
  background: linear-gradient(90deg, var(--income-color), var(--income-light));
}

.bar-expense {
  background: linear-gradient(
    90deg,
    var(--expense-color),
    var(--expense-light)
  );
}

.clear-filter {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.clear-filter button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .months-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}
</style>
