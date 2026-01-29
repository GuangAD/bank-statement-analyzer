/**
 * Pinia Store - 交易数据管理
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

// 扩展 dayjs
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const useTransactionStore = defineStore("transactions", () => {
  // ==================== 状态 ====================

  // 原始交易数据
  const rawTransactions = ref([]);

  // 解析信息
  const parseInfo = ref({
    bankName: "",
    accountInfo: {},
    parsedAt: null,
  });

  // 筛选条件
  const filters = ref({
    dateRange: [null, null], // [开始日期, 结束日期]
    type: "all", // all | income | expense
    categories: [], // 分类ID数组
    amountRange: [null, null], // [最小金额, 最大金额]
    keyword: "", // 搜索关键词
  });

  // 排序方式
  const sortBy = ref("date"); // date | amount
  const sortOrder = ref("desc"); // asc | desc

  // ==================== 计算属性 ====================

  // 筛选后的交易记录
  const filteredTransactions = computed(() => {
    let result = [...rawTransactions.value];

    // 日期范围筛选
    if (filters.value.dateRange[0]) {
      const startDate = dayjs(filters.value.dateRange[0]);
      result = result.filter((t) =>
        dayjs(t.date).isSameOrAfter(startDate, "day"),
      );
    }
    if (filters.value.dateRange[1]) {
      const endDate = dayjs(filters.value.dateRange[1]);
      result = result.filter((t) =>
        dayjs(t.date).isSameOrBefore(endDate, "day"),
      );
    }

    // 收支类型筛选
    if (filters.value.type !== "all") {
      result = result.filter((t) => t.type === filters.value.type);
    }

    // 分类筛选
    if (filters.value.categories.length > 0) {
      result = result.filter((t) =>
        filters.value.categories.includes(t.category),
      );
    }

    // 金额范围筛选
    if (filters.value.amountRange[0] !== null) {
      result = result.filter((t) => t.amount >= filters.value.amountRange[0]);
    }
    if (filters.value.amountRange[1] !== null) {
      result = result.filter((t) => t.amount <= filters.value.amountRange[1]);
    }

    // 关键词搜索
    if (filters.value.keyword.trim()) {
      const keyword = filters.value.keyword.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(keyword) ||
          t.counterparty.toLowerCase().includes(keyword),
      );
    }

    // 排序
    result.sort((a, b) => {
      let compare = 0;
      if (sortBy.value === "date") {
        compare = new Date(a.datetime) - new Date(b.datetime);
      } else if (sortBy.value === "amount") {
        compare = a.amount - b.amount;
      }
      return sortOrder.value === "desc" ? -compare : compare;
    });

    return result;
  });

  // 总收入
  const totalIncome = computed(() => {
    return filteredTransactions.value
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  });

  // 总支出
  const totalExpense = computed(() => {
    return filteredTransactions.value
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  });

  // 结余
  const balance = computed(() => {
    return totalIncome.value - totalExpense.value;
  });

  // 收入笔数
  const incomeCount = computed(() => {
    return filteredTransactions.value.filter((t) => t.type === "income").length;
  });

  // 支出笔数
  const expenseCount = computed(() => {
    return filteredTransactions.value.filter((t) => t.type === "expense")
      .length;
  });

  // 按分类统计（用于饼图）
  const categoryStats = computed(() => {
    const stats = {};

    filteredTransactions.value.forEach((t) => {
      const key = t.category;
      if (!stats[key]) {
        stats[key] = {
          categoryId: key,
          categoryInfo: t.categoryInfo,
          count: 0,
          income: 0,
          expense: 0,
          total: 0,
        };
      }

      stats[key].count++;
      if (t.type === "income") {
        stats[key].income += t.amount;
      } else {
        stats[key].expense += t.amount;
      }
      stats[key].total = stats[key].income + stats[key].expense;
    });

    return Object.values(stats).sort((a, b) => b.expense - a.expense);
  });

  // 按月份统计（用于柱状图）
  const monthlyStats = computed(() => {
    const stats = {};

    filteredTransactions.value.forEach((t) => {
      const month = dayjs(t.date).format("YYYY-MM");
      if (!stats[month]) {
        stats[month] = { month, income: 0, expense: 0 };
      }

      if (t.type === "income") {
        stats[month].income += t.amount;
      } else {
        stats[month].expense += t.amount;
      }
    });

    return Object.values(stats).sort((a, b) => a.month.localeCompare(b.month));
  });

  // 按日统计（用于趋势图和热力图）
  const dailyStats = computed(() => {
    const stats = {};

    filteredTransactions.value.forEach((t) => {
      const day = dayjs(t.date).format("YYYY-MM-DD");
      if (!stats[day]) {
        stats[day] = { date: day, income: 0, expense: 0, count: 0 };
      }

      stats[day].count++;
      if (t.type === "income") {
        stats[day].income += t.amount;
      } else {
        stats[day].expense += t.amount;
      }
    });

    return Object.values(stats).sort((a, b) => a.date.localeCompare(b.date));
  });

  // 日期范围
  const dateRange = computed(() => {
    if (rawTransactions.value.length === 0) return { start: null, end: null };

    const dates = rawTransactions.value.map((t) => t.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  });

  // ==================== 方法 ====================

  /**
   * 加载解析结果
   */
  function loadParseResult(result) {
    rawTransactions.value = result.transactions || [];
    parseInfo.value = {
      bankName: result.bankName,
      accountInfo: result.accountInfo,
      parsedAt: new Date(),
    };

    // 重置筛选条件
    resetFilters();
  }

  /**
   * 追加交易记录（多文件上传）
   */
  function appendTransactions(transactions) {
    // 去重：根据日期+时间+金额
    const existingKeys = new Set(
      rawTransactions.value.map((t) => `${t.date}-${t.time}-${t.amount}`),
    );

    const newTransactions = transactions.filter(
      (t) => !existingKeys.has(`${t.date}-${t.time}-${t.amount}`),
    );

    rawTransactions.value = [...rawTransactions.value, ...newTransactions].sort(
      (a, b) => new Date(b.datetime) - new Date(a.datetime),
    );
  }

  /**
   * 更新交易分类
   */
  function updateTransactionCategory(transactionId, newCategory) {
    const transaction = rawTransactions.value.find(
      (t) => t.id === transactionId,
    );
    if (transaction) {
      transaction.category = newCategory.id;
      transaction.categoryInfo = newCategory;
    }
  }

  /**
   * 更新交易备注
   */
  function updateTransactionNote(transactionId, note) {
    const transaction = rawTransactions.value.find(
      (t) => t.id === transactionId,
    );
    if (transaction) {
      transaction.userNote = note;
    }
  }

  /**
   * 设置筛选条件
   */
  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters };
  }

  /**
   * 重置筛选条件
   */
  function resetFilters() {
    filters.value = {
      dateRange: [null, null],
      type: "all",
      categories: [],
      amountRange: [null, null],
      keyword: "",
    };
  }

  /**
   * 设置排序
   */
  function setSort(by, order) {
    sortBy.value = by;
    sortOrder.value = order;
  }

  /**
   * 清空所有数据
   */
  function clearAll() {
    rawTransactions.value = [];
    parseInfo.value = { bankName: "", accountInfo: {}, parsedAt: null };
    resetFilters();
  }

  /**
   * 根据文件名删除交易记录
   */
  function removeTransactionsByFile(fileName) {
    rawTransactions.value = rawTransactions.value.filter(
      (t) => t.sourceFile !== fileName,
    );
  }

  return {
    // 状态
    rawTransactions,
    parseInfo,
    filters,
    sortBy,
    sortOrder,

    // 计算属性
    filteredTransactions,
    totalIncome,
    totalExpense,
    balance,
    incomeCount,
    expenseCount,
    categoryStats,
    monthlyStats,
    dailyStats,
    dateRange,

    // 方法
    loadParseResult,
    appendTransactions,
    updateTransactionCategory,
    updateTransactionNote,
    setFilters,
    resetFilters,
    setSort,
    clearAll,
    removeTransactionsByFile,
  };
});
