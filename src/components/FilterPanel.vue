<template>
  <div class="filter-panel">
    <div class="filter-row">
      <!-- 时间范围 -->
      <div class="filter-item">
        <label class="filter-label">📅 时间范围</label>
        <div class="date-inputs">
          <input
            type="date"
            v-model="localFilters.startDate"
            @change="applyFilters"
            :max="localFilters.endDate || undefined"
          />
          <span class="date-sep">至</span>
          <input
            type="date"
            v-model="localFilters.endDate"
            @change="applyFilters"
            :min="localFilters.startDate || undefined"
          />
        </div>
        <div class="quick-dates">
          <button
            v-for="option in dateQuickOptions"
            :key="option.label"
            class="quick-btn"
            :class="{ active: activeQuickDate === option.label }"
            @click="setQuickDate(option)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- 收支类型 -->
      <div class="filter-item">
        <label class="filter-label">💱 收支类型</label>
        <div class="type-buttons">
          <button
            class="type-btn"
            :class="{ active: localFilters.type === 'all' }"
            @click="setType('all')"
          >
            全部
          </button>
          <button
            class="type-btn income"
            :class="{ active: localFilters.type === 'income' }"
            @click="setType('income')"
          >
            收入
          </button>
          <button
            class="type-btn expense"
            :class="{ active: localFilters.type === 'expense' }"
            @click="setType('expense')"
          >
            支出
          </button>
        </div>
      </div>

      <!-- 分类筛选 -->
      <div class="filter-item category-filter">
        <label class="filter-label">🏷️ 分类</label>
        <div
          class="category-select"
          @click="showCategoryDropdown = !showCategoryDropdown"
        >
          <span
            class="category-placeholder"
            v-if="localFilters.categories.length === 0"
          >
            全部分类
          </span>
          <span class="category-selected" v-else>
            已选 {{ localFilters.categories.length }} 个
          </span>
          <svg
            class="dropdown-arrow"
            :class="{ open: showCategoryDropdown }"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <div class="category-dropdown" v-if="showCategoryDropdown">
          <div class="category-actions">
            <button @click="selectAllCategories">全选</button>
            <button @click="clearCategories">清空</button>
          </div>
          <div class="category-list">
            <label
              v-for="cat in categories"
              :key="cat.id"
              class="category-item"
            >
              <input
                type="checkbox"
                :value="cat.id"
                v-model="localFilters.categories"
                @change="applyFilters"
              />
              <span class="category-icon">{{ cat.icon }}</span>
              <span class="category-name">{{ cat.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 关键词搜索 -->
      <div class="filter-item search-filter">
        <label class="filter-label">🔍 搜索</label>
        <div class="search-input-wrapper">
          <input
            type="text"
            v-model="localFilters.keyword"
            placeholder="搜索摘要、对方户名..."
            @input="debouncedApplyFilters"
          />
          <button
            class="clear-btn"
            v-if="localFilters.keyword"
            @click="clearKeyword"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 筛选结果信息 -->
    <div class="filter-info" v-if="hasActiveFilters">
      <span class="filter-result">
        共 {{ filteredCount }} 条记录
        <template v-if="filteredCount !== totalCount">
          （筛选自 {{ totalCount }} 条）
        </template>
      </span>
      <button class="reset-btn" @click="resetFilters">重置筛选</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import { useTransactionStore } from "../stores/transactionStore.js";
import { CATEGORIES } from "../constants/categories.js";
import dayjs from "dayjs";

const store = useTransactionStore();
const categories = CATEGORIES;

const showCategoryDropdown = ref(false);
const activeQuickDate = ref("");

const localFilters = reactive({
  startDate: "",
  endDate: "",
  type: "all",
  categories: [],
  keyword: "",
});

// 快捷日期选项
const dateQuickOptions = [
  {
    label: "本月",
    getValue: () => [
      dayjs().startOf("month").format("YYYY-MM-DD"),
      dayjs().format("YYYY-MM-DD"),
    ],
  },
  {
    label: "上月",
    getValue: () => [
      dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
      dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
    ],
  },
  {
    label: "近3月",
    getValue: () => [
      dayjs().subtract(3, "month").format("YYYY-MM-DD"),
      dayjs().format("YYYY-MM-DD"),
    ],
  },
  {
    label: "今年",
    getValue: () => [
      dayjs().startOf("year").format("YYYY-MM-DD"),
      dayjs().format("YYYY-MM-DD"),
    ],
  },
  { label: "全部", getValue: () => ["", ""] },
];

const filteredCount = computed(() => store.filteredTransactions.length);
const totalCount = computed(() => store.rawTransactions.length);

const hasActiveFilters = computed(() => {
  return (
    localFilters.startDate ||
    localFilters.endDate ||
    localFilters.type !== "all" ||
    localFilters.categories.length > 0 ||
    localFilters.keyword
  );
});

// 防抖搜索
let debounceTimer = null;
function debouncedApplyFilters() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 300);
}

function applyFilters() {
  store.setFilters({
    dateRange: [localFilters.startDate || null, localFilters.endDate || null],
    type: localFilters.type,
    categories: localFilters.categories,
    keyword: localFilters.keyword,
  });
}

function setType(type) {
  localFilters.type = type;
  applyFilters();
}

function setQuickDate(option) {
  const [start, end] = option.getValue();
  localFilters.startDate = start;
  localFilters.endDate = end;
  activeQuickDate.value = option.label;
  applyFilters();
}

function selectAllCategories() {
  localFilters.categories = categories.map((c) => c.id);
  applyFilters();
}

function clearCategories() {
  localFilters.categories = [];
  applyFilters();
}

function clearKeyword() {
  localFilters.keyword = "";
  applyFilters();
}

function resetFilters() {
  localFilters.startDate = "";
  localFilters.endDate = "";
  localFilters.type = "all";
  localFilters.categories = [];
  localFilters.keyword = "";
  activeQuickDate.value = "";
  store.resetFilters();
}

// 点击外部关闭下拉框
function handleClickOutside(e) {
  if (!e.target.closest(".category-filter")) {
    showCategoryDropdown.value = false;
  }
}

// 监听 store 筛选条件变化（用于响应月度看板等外部设置的筛选）
watch(
  () => store.filters,
  (newFilters) => {
    // 更新本地筛选状态
    localFilters.startDate = newFilters.dateRange[0] || "";
    localFilters.endDate = newFilters.dateRange[1] || "";
    localFilters.type = newFilters.type;
    localFilters.categories = [...newFilters.categories];
    localFilters.keyword = newFilters.keyword;

    // 清除快捷日期的激活状态
    activeQuickDate.value = "";
  },
  { deep: true },
);

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.filter-panel {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.filter-row {
  display: grid;
  grid-template-columns: auto auto 1fr 1fr;
  gap: var(--spacing-lg);
  align-items: flex-start;
}

@media (max-width: 1200px) {
  .filter-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .filter-row {
    grid-template-columns: 1fr;
  }
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* 日期输入 */
.date-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.date-inputs input {
  padding: var(--spacing-sm);
  font-size: 0.875rem;
  width: 130px;
}

.date-sep {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.quick-dates {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.quick-btn {
  padding: 4px 8px;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--bg-color);
  color: var(--text-secondary);
  border: 1px solid transparent;
}

.quick-btn:hover {
  background: var(--primary-color);
  color: white;
}

.quick-btn.active {
  background: var(--primary-color);
  color: white;
}

/* 类型按钮 */
.type-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.type-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--bg-color);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid var(--border-color);
}

.type-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.type-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.type-btn.income.active {
  background: var(--income-color);
  border-color: var(--income-color);
}

.type-btn.expense.active {
  background: var(--expense-color);
  border-color: var(--expense-color);
}

/* 分类选择 */
.category-filter {
  position: relative;
}

.category-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  min-width: 150px;
}

.category-select:hover {
  border-color: var(--primary-color);
}

.category-placeholder {
  color: var(--text-muted);
}

.category-selected {
  color: var(--primary-color);
  font-weight: 500;
}

.dropdown-arrow {
  transition: transform var(--transition-fast);
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.category-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--spacing-xs);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.category-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}

.category-actions button {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--bg-color);
  color: var(--text-secondary);
}

.category-actions button:hover {
  background: var(--primary-color);
  color: white;
}

.category-list {
  padding: var(--spacing-sm);
}

.category-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.category-item:hover {
  background: var(--bg-color);
}

.category-item input {
  width: auto;
  padding: 0;
}

.category-icon {
  font-size: 1rem;
}

.category-name {
  font-size: 0.875rem;
  color: var(--text-primary);
}

/* 搜索输入 */
.search-input-wrapper {
  position: relative;
}

.search-input-wrapper input {
  width: 100%;
  padding-right: 32px;
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--text-muted);
  color: white;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  background: var(--expense-color);
}

/* 筛选结果 */
.filter-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.filter-result {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.reset-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 0.875rem;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.reset-btn:hover {
  background: var(--primary-color);
  color: white;
}
</style>
