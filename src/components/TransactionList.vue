<template>
  <div class="transaction-list">
    <!-- 列表头部 -->
    <div class="list-header">
      <div class="list-title">
        <h3>交易明细</h3>
        <span class="list-count">共 {{ transactions.length }} 笔</span>
      </div>

      <div class="list-actions">
        <!-- 排序 -->
        <div class="sort-control">
          <select v-model="sortOption" @change="onSortChange">
            <option value="date-desc">时间 ↓ 最新</option>
            <option value="date-asc">时间 ↑ 最早</option>
            <option value="amount-desc">金额 ↓ 最大</option>
            <option value="amount-asc">金额 ↑ 最小</option>
          </select>
        </div>

        <!-- 导出按钮 -->
        <div class="export-buttons">
          <button
            class="btn-secondary export-btn"
            @click="exportToExcel"
            :disabled="isExporting"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Excel
          </button>
          <button
            class="btn-secondary export-btn"
            @click="exportToCSV"
            :disabled="isExporting"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-expand"></th>
            <th class="col-date">日期</th>
            <th class="col-description">摘要</th>
            <th class="col-counterparty">对方户名</th>
            <th class="col-category">分类</th>
            <th class="col-amount">金额</th>
            <th class="col-balance">余额</th>
          </tr>
        </thead>
        <tbody
          v-for="(transaction, index) in paginatedTransactions"
          :key="transaction.id"
        >
          <!-- 主行 -->
          <tr
            :class="{
              'income-row': transaction.type === 'income',
              'expense-row': transaction.type === 'expense',
              'is-expanded': expandedId === transaction.id,
            }"
            @click="toggleExpand(transaction.id)"
          >
            <td class="col-expand">
              <span
                class="expand-icon"
                :class="{ expanded: expandedId === transaction.id }"
                >▶</span
              >
            </td>
            <td class="col-date">
              <div class="date-cell">
                <span class="date-value">{{ transaction.date }}</span>
                <span class="time-value">{{ transaction.time }}</span>
              </div>
            </td>
            <td class="col-description">
              <span class="description-text" :title="transaction.description">
                {{ truncateText(transaction.description, 30) }}
              </span>
            </td>
            <td class="col-counterparty">
              <span class="counterparty-text" :title="transaction.counterparty">
                {{ truncateText(transaction.counterparty, 20) || "-" }}
              </span>
            </td>
            <td class="col-category">
              <span
                class="category-badge"
                :style="{
                  background: transaction.categoryInfo?.color + '20',
                  color: transaction.categoryInfo?.color,
                }"
                @click.stop="openCategoryEdit(transaction)"
              >
                {{ transaction.categoryInfo?.icon }}
                {{ transaction.categoryInfo?.name }}
                <span class="edit-hint">✎</span>
              </span>
            </td>
            <td class="col-amount">
              <span
                class="amount-value"
                :class="
                  transaction.type === 'income' ? 'text-income' : 'text-expense'
                "
              >
                {{ transaction.type === "income" ? "+" : "-"
                }}{{ formatCurrency(transaction.amount) }}
              </span>
            </td>
            <td class="col-balance">
              <span class="balance-value">{{
                formatCurrency(transaction.balance)
              }}</span>
            </td>
          </tr>

          <!-- 展开详情行 -->
          <tr v-if="expandedId === transaction.id" class="detail-row">
            <td colspan="7">
              <div class="detail-content">
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">完整摘要</span>
                    <span class="detail-value">{{
                      transaction.description || "无"
                    }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">对方户名</span>
                    <span class="detail-value">{{
                      transaction.counterparty || "无"
                    }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">支付渠道</span>
                    <span class="detail-value">{{
                      transaction.counterpartyBank || "无"
                    }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">凭证号</span>
                    <span class="detail-value">{{
                      transaction.voucherNumber || "无"
                    }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">来源文件</span>
                    <span class="detail-value">{{
                      transaction.sourceFile || "未知"
                    }}</span>
                  </div>
                </div>

                <!-- 用户备注 -->
                <div class="note-section">
                  <label class="note-label">📝 我的备注</label>
                  <div class="note-input-wrapper">
                    <input
                      type="text"
                      :value="transaction.userNote || ''"
                      @blur="saveNote(transaction, $event.target.value)"
                      @keyup.enter="$event.target.blur()"
                      placeholder="添加备注，帮助记忆这笔交易的用途..."
                      class="note-input"
                    />
                  </div>
                </div>

                <!-- 原始数据（调试用） -->
                <div class="raw-data" v-if="transaction.rawLine">
                  <details>
                    <summary>查看原始解析数据</summary>
                    <pre>{{ transaction.rawLine }}</pre>
                  </details>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 空状态 -->
      <div class="empty-state" v-if="transactions.length === 0">
        <div class="empty-icon">📋</div>
        <p>暂无交易记录</p>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        ◀
      </button>

      <template v-for="page in visiblePages" :key="page">
        <button
          v-if="page !== '...'"
          class="page-btn"
          :class="{ active: page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <span v-else class="page-ellipsis">...</span>
      </template>

      <button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        ▶
      </button>

      <select
        class="page-size-select"
        v-model="pageSize"
        @change="onPageSizeChange"
      >
        <option :value="20">20条/页</option>
        <option :value="50">50条/页</option>
        <option :value="100">100条/页</option>
      </select>
    </div>

    <!-- 分类编辑弹窗 -->
    <div
      class="modal-overlay"
      v-if="editingTransaction"
      @click="closeCategoryEdit"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h4>修改分类</h4>
          <button class="modal-close" @click="closeCategoryEdit">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">选择新的分类：</p>
          <div class="category-grid">
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="category-option"
              :class="{ active: editingTransaction.category === cat.id }"
              :style="{ borderColor: cat.color }"
              @click="selectCategory(cat)"
            >
              <span class="cat-icon">{{ cat.icon }}</span>
              <span class="cat-name">{{ cat.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useTransactionStore } from "../stores/transactionStore.js";
import { useExport } from "../composables/useExport.js";
import { formatCurrency, truncateText } from "../utils/formatters.js";
import { CATEGORIES } from "../constants/categories.js";

const store = useTransactionStore();
const { isExporting, exportToExcel, exportToCSV } = useExport();
const categories = CATEGORIES;

const transactions = computed(() => store.filteredTransactions);

// 展开的交易ID
const expandedId = ref(null);

// 正在编辑分类的交易
const editingTransaction = ref(null);

// 排序
const sortOption = ref("date-desc");

function onSortChange() {
  const [by, order] = sortOption.value.split("-");
  store.setSort(by, order);
}

// 切换展开/收起
function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

// 保存用户备注
function saveNote(transaction, note) {
  store.updateTransactionNote(transaction.id, note);
}

// 打开分类编辑
function openCategoryEdit(transaction) {
  editingTransaction.value = transaction;
}

// 关闭分类编辑
function closeCategoryEdit() {
  editingTransaction.value = null;
}

// 选择分类
function selectCategory(category) {
  if (editingTransaction.value) {
    store.updateTransactionCategory(editingTransaction.value.id, category);
    closeCategoryEdit();
  }
}

// 分页
const currentPage = ref(1);
const pageSize = ref(20);

const totalPages = computed(() =>
  Math.ceil(transactions.value.length / pageSize.value),
);

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return transactions.value.slice(start, end);
});

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (current > 3) {
      pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push("...");
    }

    pages.push(total);
  }

  return pages;
});

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function onPageSizeChange() {
  currentPage.value = 1;
}
</script>

<style scoped>
.transaction-list {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.list-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.list-title h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.list-count {
  font-size: 0.875rem;
  color: var(--text-muted);
  padding: 4px 12px;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
}

.list-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.sort-control select {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.875rem;
}

.export-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.export-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

/* 表格 */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--divider-color);
}

.data-table th {
  background: var(--bg-color);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.data-table tbody tr {
  transition: background var(--transition-fast);
  cursor: pointer;
}

.data-table tbody tr:hover {
  background: var(--bg-color);
}

.data-table tbody tr.is-expanded {
  background: rgba(25, 118, 210, 0.05);
}

.income-row {
  border-left: 3px solid var(--income-color);
}

.expense-row {
  border-left: 3px solid var(--expense-color);
}

/* 展开图标 */
.col-expand {
  width: 30px;
  padding: var(--spacing-sm) !important;
}

.expand-icon {
  display: inline-block;
  color: var(--text-muted);
  font-size: 0.7rem;
  transition: transform var(--transition-fast);
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

/* 列样式 */
.col-date {
  width: 100px;
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-value {
  font-weight: 500;
  color: var(--text-primary);
}

.time-value {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.col-description {
  min-width: 180px;
}

.description-text {
  color: var(--text-primary);
}

.col-counterparty {
  min-width: 130px;
}

.counterparty-text {
  color: var(--text-secondary);
}

.col-category {
  width: 130px;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.category-badge:hover {
  transform: scale(1.05);
}

.edit-hint {
  opacity: 0;
  font-size: 0.7rem;
  transition: opacity var(--transition-fast);
}

.category-badge:hover .edit-hint {
  opacity: 1;
}

.col-amount {
  width: 120px;
  text-align: right;
}

.amount-value {
  font-weight: 600;
  font-family: "JetBrains Mono", monospace;
}

.col-balance {
  width: 110px;
  text-align: right;
}

.balance-value {
  color: var(--text-secondary);
  font-family: "JetBrains Mono", monospace;
}

/* 详情行 */
.detail-row {
  cursor: default !important;
}

.detail-row:hover {
  background: transparent !important;
}

.detail-row td {
  padding: 0 !important;
  background: var(--bg-color);
}

.detail-content {
  padding: var(--spacing-lg);
  border-left: 3px solid var(--primary-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.detail-value {
  color: var(--text-primary);
  font-size: 0.9rem;
}

.note-section {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.note-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.note-input-wrapper {
  max-width: 500px;
}

.note-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  transition: border-color var(--transition-fast);
}

.note-input:focus {
  border-color: var(--primary-color);
  outline: none;
}

.raw-data {
  margin-top: var(--spacing-md);
}

.raw-data summary {
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
}

.raw-data pre {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 空状态 */
.empty-state {
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.page-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--bg-color);
  color: var(--text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.page-btn.active {
  background: var(--primary-color);
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
}

.page-ellipsis {
  color: var(--text-muted);
}

.page-size-select {
  margin-left: var(--spacing-md);
  padding: var(--spacing-sm);
  font-size: 0.875rem;
}

/* 分类编辑弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h4 {
  margin: 0;
  font-size: 1rem;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-color);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--expense-bg);
  color: var(--expense-color);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-hint {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--spacing-sm);
}

.category-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-md);
  background: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.category-option:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.category-option.active {
  border-color: var(--primary-color);
  background: rgba(25, 118, 210, 0.1);
}

.cat-icon {
  font-size: 1.25rem;
}

.cat-name {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .data-table {
    font-size: 0.875rem;
  }

  .data-table th,
  .data-table td {
    padding: var(--spacing-sm);
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
