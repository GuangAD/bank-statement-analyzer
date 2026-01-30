<template>
  <div class="dashboard">
    <!-- 收入卡片 -->
    <div class="stat-card income-card">
      <div class="stat-icon">💰</div>
      <div class="stat-content">
        <span class="stat-label">总收入</span>
        <span class="stat-value text-income">{{
          formatCurrency(totalIncome)
        }}</span>
        <span class="stat-count">{{ incomeCount }} 笔</span>
      </div>
      <div class="stat-bg-icon">↑</div>
    </div>

    <!-- 支出卡片 -->
    <div class="stat-card expense-card">
      <div class="stat-icon">💸</div>
      <div class="stat-content">
        <span class="stat-label">总支出</span>
        <span class="stat-value text-expense">{{
          formatCurrency(totalExpense)
        }}</span>
        <span class="stat-count">{{ expenseCount }} 笔</span>
      </div>
      <div class="stat-bg-icon">↓</div>
    </div>

    <!-- 收支净额卡片（收入-支出） -->
    <div class="stat-card balance-card">
      <div class="stat-icon">📊</div>
      <div class="stat-content">
        <span class="stat-label">收支净额</span>
        <span
          class="stat-value"
          :class="balance >= 0 ? 'text-income' : 'text-expense'"
        >
          {{ balance >= 0 ? "+" : "" }}{{ formatCurrency(balance) }}
        </span>
        <span class="stat-count">收入 - 支出</span>
      </div>
      <div class="stat-bg-icon">=</div>
    </div>

    <!-- 账户变动卡片（期末-期初） -->
    <div class="stat-card change-card">
      <div class="stat-icon">🏦</div>
      <div class="stat-content">
        <span class="stat-label">账户变动</span>
        <span
          class="stat-value"
          :class="balanceChange >= 0 ? 'text-income' : 'text-expense'"
        >
          {{ balanceChange >= 0 ? "+" : "" }}{{ formatCurrency(balanceChange) }}
        </span>
        <span
          class="stat-count"
          :title="`期初: ${formatCurrency(startingBalance)} → 期末: ${formatCurrency(endingBalance)}`"
        >
          期末 - 期初
        </span>
      </div>
      <div class="stat-bg-icon">Δ</div>
    </div>

    <!-- 数据差异提示 -->
    <div class="stat-card diff-card" v-if="hasDifference">
      <div class="stat-icon">⚠️</div>
      <div class="stat-content">
        <span class="stat-label">数据差异</span>
        <span class="stat-value text-warning">
          {{ formatCurrency(Math.abs(difference)) }}
        </span>
        <span class="stat-count">可能存在解析误差</span>
      </div>
    </div>

    <!-- 收支比例卡片 -->
    <div class="stat-card ratio-card">
      <div class="stat-icon">📈</div>
      <div class="stat-content">
        <span class="stat-label">收支比例</span>
        <div class="ratio-chart">
          <div class="ratio-bar">
            <div
              class="ratio-income"
              :style="{ width: incomeRatio + '%' }"
              :title="`收入: ${incomeRatio.toFixed(1)}%`"
            ></div>
            <div
              class="ratio-expense"
              :style="{ width: expenseRatio + '%' }"
              :title="`支出: ${expenseRatio.toFixed(1)}%`"
            ></div>
          </div>
          <div class="ratio-labels">
            <span class="text-income">收入 {{ incomeRatio.toFixed(0) }}%</span>
            <span class="text-expense"
              >支出 {{ expenseRatio.toFixed(0) }}%</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useTransactionStore } from "../stores/transactionStore.js";
import { formatCurrency } from "../utils/formatters.js";
import { add, subtract, percentage, abs } from "../utils/calculator.js";

const store = useTransactionStore();

const totalIncome = computed(() => store.totalIncome);
const totalExpense = computed(() => store.totalExpense);
const balance = computed(() => store.balance);
const incomeCount = computed(() => store.incomeCount);
const expenseCount = computed(() => store.expenseCount);

// 账户余额相关
const startingBalance = computed(() => store.startingBalance);
const endingBalance = computed(() => store.endingBalance);
const balanceChange = computed(() => store.balanceChange);

// 数据差异（收支净额 vs 账户变动）
const difference = computed(() => subtract(balance.value, balanceChange.value));
const hasDifference = computed(() => abs(difference.value) > 0.01);

// 使用精确计算
const total = computed(() => add(totalIncome.value, totalExpense.value));
const incomeRatio = computed(() =>
  total.value > 0 ? percentage(totalIncome.value, total.value, 2) : 50,
);
const expenseRatio = computed(() =>
  total.value > 0 ? percentage(totalExpense.value, total.value, 2) : 50,
);
</script>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

@media (max-width: 1200px) {
  .dashboard {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.income-card .stat-icon {
  background: var(--income-bg);
}

.expense-card .stat-icon {
  background: var(--expense-bg);
}

.balance-card .stat-icon {
  background: var(--balance-bg);
}

.ratio-card .stat-icon {
  background: linear-gradient(135deg, var(--income-bg), var(--expense-bg));
}

.change-card .stat-icon {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
}

.diff-card .stat-icon {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
}

.text-warning {
  color: #f57c00 !important;
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: "JetBrains Mono", monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-count {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.stat-bg-icon {
  position: absolute;
  right: -10px;
  bottom: -10px;
  font-size: 5rem;
  opacity: 0.05;
  font-weight: bold;
  pointer-events: none;
}

/* 收支比例 */
.ratio-chart {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  width: 100%;
}

.ratio-bar {
  display: flex;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--border-color);
}

.ratio-income {
  background: linear-gradient(90deg, var(--income-color), var(--income-light));
  transition: width var(--transition-base);
}

.ratio-expense {
  background: linear-gradient(
    90deg,
    var(--expense-light),
    var(--expense-color)
  );
  transition: width var(--transition-base);
}

.ratio-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
