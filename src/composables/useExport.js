/**
 * 数据导出组合式函数
 */

import { ref } from "vue";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { useTransactionStore } from "../stores/transactionStore.js";

export function useExport() {
  const isExporting = ref(false);
  const store = useTransactionStore();

  /**
   * 导出为 Excel 文件
   */
  function exportToExcel(useFiltered = true) {
    isExporting.value = true;

    try {
      const transactions = useFiltered
        ? store.filteredTransactions
        : store.rawTransactions;

      // 构建工作簿数据
      const data = transactions.map((t) => ({
        日期: t.date,
        时间: t.time,
        摘要: t.description,
        对方户名: t.counterparty,
        分类: t.categoryInfo?.name || "其他",
        收支类型: t.type === "income" ? "收入" : "支出",
        金额: t.amount,
        余额: t.balance,
        凭证号码: t.voucherNumber,
      }));

      // 创建工作表
      const ws = XLSX.utils.json_to_sheet(data);

      // 设置列宽
      ws["!cols"] = [
        { wch: 12 }, // 日期
        { wch: 10 }, // 时间
        { wch: 30 }, // 摘要
        { wch: 25 }, // 对方户名
        { wch: 12 }, // 分类
        { wch: 8 }, // 收支类型
        { wch: 12 }, // 金额
        { wch: 12 }, // 余额
        { wch: 20 }, // 凭证号码
      ];

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "交易明细");

      // 添加汇总表
      const summaryData = [
        { 项目: "总收入", 金额: store.totalIncome, 笔数: store.incomeCount },
        { 项目: "总支出", 金额: store.totalExpense, 笔数: store.expenseCount },
        { 项目: "结余", 金额: store.balance, 笔数: "-" },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "汇总");

      // 添加分类统计表
      const categoryData = store.categoryStats.map((c) => ({
        分类: c.categoryInfo?.name || "其他",
        收入: c.income,
        支出: c.expense,
        笔数: c.count,
      }));
      const categorySheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, categorySheet, "分类统计");

      // 生成文件名
      const filename = `银行流水分析_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;

      // 导出
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("导出 Excel 失败:", err);
      throw err;
    } finally {
      isExporting.value = false;
    }
  }

  /**
   * 导出为 CSV 文件
   */
  function exportToCSV(useFiltered = true) {
    isExporting.value = true;

    try {
      const transactions = useFiltered
        ? store.filteredTransactions
        : store.rawTransactions;

      // 构建 CSV 内容
      const headers = [
        "日期",
        "时间",
        "摘要",
        "对方户名",
        "分类",
        "收支类型",
        "金额",
        "余额",
        "凭证号码",
      ];
      const rows = transactions.map((t) => [
        t.date,
        t.time,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${(t.counterparty || "").replace(/"/g, '""')}"`,
        t.categoryInfo?.name || "其他",
        t.type === "income" ? "收入" : "支出",
        t.amount,
        t.balance,
        t.voucherNumber,
      ]);

      // 添加 BOM 以支持中文
      const BOM = "\uFEFF";
      const csv =
        BOM + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      // 创建 Blob 并下载
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `银行流水分析_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("导出 CSV 失败:", err);
      throw err;
    } finally {
      isExporting.value = false;
    }
  }

  return {
    isExporting,
    exportToExcel,
    exportToCSV,
  };
}
