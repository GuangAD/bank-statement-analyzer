/**
 * 银行解析器路由
 * 自动识别银行类型并调用对应解析器
 */

import { parseMinshengBank, isMinshengBank } from "./MinshengParser.js";
import { parseICBCBank, isICBCStatement } from "./ICBCParser.js";
import { categorizeTransaction } from "../constants/categories.js";
import { sumTransactions, subtract } from "../utils/calculator.js";

// 已注册的解析器列表
const parsers = [
  {
    name: "民生银行",
    detect: isMinshengBank,
    parse: parseMinshengBank,
  },
  {
    name: "工商银行",
    detect: isICBCStatement,
    parse: parseICBCBank,
  },
  // 后续可添加更多银行解析器
  // { name: '招商银行', detect: isCMBBank, parse: parseCMBBank },
];

/**
 * 解析 PDF 文本
 * 自动识别银行类型并调用对应解析器
 * @param {string} text - PDF 文本内容
 * @param {string} bankName - 可选，已检测的银行名称（跳过重复检测）
 * @returns {object} 解析结果
 */
export function parseBankStatement(text, bankName = null) {
  // 如果已提供银行名称，直接使用对应解析器
  if (bankName) {
    for (const parser of parsers) {
      if (parser.name === bankName) {
        console.log(`使用 ${parser.name} 解析器`);
        return parser.parse(text);
      }
    }
  }

  // 尝试匹配已注册的解析器
  for (const parser of parsers) {
    if (parser.detect(text)) {
      console.log(`检测到 ${parser.name} 流水格式`);
      return parser.parse(text);
    }
  }

  // 未匹配到已知银行，使用通用解析器
  console.log("未识别银行类型，使用通用解析器");
  return parseGenericStatement(text);
}

/**
 * 检测银行类型
 * @param {string} text - PDF 文本内容
 * @returns {string} 银行名称
 */
export function detectBankType(text) {
  for (const parser of parsers) {
    if (parser.detect(text)) {
      return parser.name;
    }
  }
  return "未知银行";
}

/**
 * 通用银行流水解析器
 * 用于处理未知格式的银行流水
 */
function parseGenericStatement(text) {
  const transactions = [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // 通用日期正则 - 支持多种格式
  const dateRegexes = [
    /(\d{4}[-/]\d{2}[-/]\d{2})\s*(\d{2}:\d{2}:\d{2})?/,
    /(\d{2}[-/]\d{2}[-/]\d{4})\s*(\d{2}:\d{2}:\d{2})?/,
  ];

  // 金额正则
  const amountRegex = /[-+]?[\d,]+\.\d{2}/g;

  for (const line of lines) {
    // 尝试匹配日期
    let dateMatch = null;
    for (const regex of dateRegexes) {
      dateMatch = line.match(regex);
      if (dateMatch) break;
    }

    if (!dateMatch) continue;

    // 提取金额
    const amounts = line.match(amountRegex) || [];
    if (amounts.length === 0) continue;

    // 提取第一个金额作为交易金额
    const amountStr = amounts[0];
    const amount = parseFloat(amountStr.replace(/,/g, ""));

    // 判断收入/支出
    const isIncome = amountStr.startsWith("+") || amount > 0;

    // 提取描述（日期和金额之间的文本）
    const dateEnd = line.indexOf(dateMatch[0]) + dateMatch[0].length;
    const amountStart = line.indexOf(amountStr);
    const description =
      line.substring(dateEnd, amountStart).trim() || "银行交易";

    // 格式化日期
    let dateStr = dateMatch[1].replace(/\//g, "-");
    const timeStr = dateMatch[2] || "00:00:00";

    const transaction = {
      id: `${dateStr}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      time: timeStr,
      datetime: new Date(`${dateStr}T${timeStr}`),
      description,
      amount: Math.abs(amount),
      balance:
        amounts.length > 1 ? parseFloat(amounts[1].replace(/,/g, "")) : 0,
      type: isIncome ? "income" : "expense",
      counterparty: "",
      voucherNumber: "",
      rawLine: line,
    };

    // 自动分类
    const category = categorizeTransaction(
      transaction.description,
      transaction.counterparty,
    );
    transaction.category = category.id;
    transaction.categoryInfo = category;

    transactions.push(transaction);
  }

  // 计算汇总（使用精确计算）
  const incomeTransactions = transactions.filter((t) => t.type === "income");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");
  const income = sumTransactions(incomeTransactions);
  const expense = sumTransactions(expenseTransactions);

  return {
    bankName: "未知银行",
    accountInfo: {
      accountName: "",
      accountNumber: "",
      currency: "人民币",
      period: "",
    },
    transactions,
    summary: {
      totalTransactions: transactions.length,
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length,
      totalIncome: income,
      totalExpense: expense,
      balance: subtract(income, expense),
    },
  };
}

/**
 * 获取已支持的银行列表
 */
export function getSupportedBanks() {
  return parsers.map((p) => p.name);
}
