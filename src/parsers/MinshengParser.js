/**
 * 民生银行 PDF 解析器
 * 专门用于解析中国民生银行个人账户对账单
 */

import { categorizeTransaction } from "../constants/categories.js";
import { sumTransactions, subtract } from "../utils/calculator.js";

/**
 * 解析民生银行流水文本
 * @param {string} text - PDF 提取的文本内容
 * @returns {object} 解析结果
 */
export function parseMinshengBank(text) {
  const transactions = [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // 提取账户信息
  const accountInfo = extractAccountInfo(text);

  // 识别表格数据区域
  // 民生银行流水格式：凭证类型 | 凭证号码 | 摘要 | 交易时间 | 交易金额 | 账户余额 | ...

  // 日期时间正则 - 匹配 2019/05/01 15:36:01 格式
  const dateTimeRegex = /(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/;

  // 金额正则 - 匹配金额格式（包含逗号分隔符）
  const amountRegex = /[\d,]+\.\d{2}/g;

  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过表头和非数据行
    if (isHeaderOrFooter(line)) continue;

    // 检测是否包含日期时间（交易记录的标志）
    const dateMatch = line.match(dateTimeRegex);

    if (dateMatch) {
      // 找到新的交易记录
      const transaction = parseTransactionLine(line, lines, i);
      if (transaction) {
        // 自动分类
        const category = categorizeTransaction(
          transaction.description,
          transaction.counterparty,
        );
        transaction.category = category.id;
        transaction.categoryInfo = category;

        transactions.push(transaction);
      }
    }
  }

  // 计算汇总信息
  const summary = calculateSummary(transactions);

  return {
    bankName: "中国民生银行",
    accountInfo,
    transactions,
    summary,
  };
}

/**
 * 提取账户信息
 */
function extractAccountInfo(text) {
  const info = {
    accountName: "",
    accountNumber: "",
    currency: "人民币",
    period: "",
  };

  // 客户姓名
  const nameMatch = text.match(/客户姓名[：:]\s*(\S+)/);
  if (nameMatch) info.accountName = nameMatch[1];

  // 客户账号
  const accountMatch = text.match(/客户账号[：:]\s*(\d+\*+\d*)/);
  if (accountMatch) info.accountNumber = accountMatch[1];

  // 起止日期
  const periodMatch = text.match(
    /起止日期[：:]\s*(\d{4}\/\d{2}\/\d{2})\s*[-~至]\s*(\d{4}\/\d{2}\/\d{2})/,
  );
  if (periodMatch) info.period = `${periodMatch[1]} 至 ${periodMatch[2]}`;

  return info;
}

/**
 * 解析单行交易记录
 * 根据民生银行PDF格式：凭证号码 | 交易时间 | 摘要 | 金额 | 余额 | ... | 对方户名/账号 | 对方行名
 */
function parseTransactionLine(line, allLines, index) {
  try {
    // 提取日期时间
    const dateMatch = line.match(/(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (!dateMatch) return null;

    const dateStr = dateMatch[1];
    const timeStr = dateMatch[2];

    // 提取金额（可能带负号，支持逗号分隔）
    // 匹配格式：-1,316.78 或 25.66 或 -6.00
    const amounts = line.match(/-?[\d,]+\.\d{2}/g) || [];

    // 根据民生银行格式，第一个金额是交易金额，第二个是账户余额
    let amount = 0;
    let balance = 0;
    let isIncome = false;

    if (amounts.length >= 1) {
      const rawAmount = parseFloat(amounts[0].replace(/,/g, ""));
      // 根据金额正负判断收入/支出
      isIncome = rawAmount > 0;
      amount = Math.abs(rawAmount); // 存储绝对值，类型由 isIncome 决定
    }
    if (amounts.length >= 2) {
      balance = parseFloat(amounts[1].replace(/,/g, ""));
    }

    // 提取凭证号码 - 在日期之前的长数字
    const beforeDate = line.split(dateMatch[0])[0].trim();
    const voucherMatch = beforeDate.match(/(\d{10,})/);
    const voucherNumber = voucherMatch ? voucherMatch[1] : "";

    // 提取摘要 - 在日期时间之后、第一个金额之前的文本
    // 格式如: "支付宝-快捷支付-还款", "财付通-快捷支付-微信转账"
    let description = "";
    const afterDateTime = line.split(dateMatch[0])[1] || "";

    if (amounts.length > 0) {
      // 摘要在日期时间和第一个金额之间
      const beforeAmount = afterDateTime.split(amounts[0])[0].trim();
      description = beforeAmount;
    } else {
      description = afterDateTime.trim();
    }

    // 清理摘要，移除可能的前导空格和特殊字符
    description = description.replace(/^\s+/, "").replace(/\s+$/, "");

    // 提取对方信息 - 在最后一个金额之后的文本
    let counterparty = "";
    let counterpartyBank = "";

    if (amounts.length > 0) {
      const lastAmount = amounts[amounts.length - 1];
      const afterLastAmount = line.split(lastAmount).slice(-1)[0] || "";

      // 尝试提取对方行名（支付渠道）
      const bankPatterns = [
        /支付宝/,
        /财付通/,
        /网银在线/,
        /抖音支付/,
        /微信/,
        /京东支付/,
        /银联/,
        /云闪付/,
        /美团支付/,
        /快钱/,
        /易宝支付/,
      ];

      for (const pattern of bankPatterns) {
        const match = afterLastAmount.match(pattern);
        if (match) {
          counterpartyBank = match[0];
          break;
        }
      }

      // 提取对方户名 - 可能包含账号
      // 格式如: "支付宝信贷业务待还款账户/208822368206130015*"
      const counterpartyPatterns = [
        // 匹配 "名称/账号" 格式
        /([^\d\s\/]+(?:账户|公司|店铺|旗舰店|药房|有限公司)?)\/?(\d+\**)*/,
        // 匹配中文名称
        /[\u4e00-\u9fa5]{4,}/,
      ];

      // 清理对方信息
      let cleanedAfterAmount = afterLastAmount
        .replace(/转账|跨行支付|0001|现转标志|交易渠道|交易机构/g, "")
        .trim();

      // 尝试提取有意义的对方名称
      const nameMatch = cleanedAfterAmount.match(/([^\d\/\s]{2,})/);
      if (nameMatch) {
        counterparty = nameMatch[1].trim();
        // 如果对方名称就是支付渠道，尝试从摘要中提取更详细的信息
        if (counterparty === counterpartyBank || counterparty.length < 3) {
          // 从摘要中提取商户名称
          // 如 "网银在线-快捷支付-京东大药房" -> "京东大药房"
          const descParts = description.split("-");
          if (descParts.length >= 3) {
            counterparty = descParts.slice(2).join("-").trim();
          }
        }
      }
    }

    // 如果摘要为空但有对方银行信息，使用对方银行作为摘要
    if (!description && counterpartyBank) {
      description = counterpartyBank + "交易";
    }

    // 如果对方户名为空，尝试从摘要中提取
    if (!counterparty && description) {
      const descParts = description.split("-");
      if (descParts.length >= 3) {
        // 如 "支付宝-快捷支付-还款" -> 对方可能是 "支付宝"
        counterparty =
          descParts[descParts.length - 1].trim() || descParts[0].trim();
      } else if (descParts.length >= 1) {
        counterparty = descParts[0].trim();
      }
    }

    return {
      id: `${dateStr}-${timeStr}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr.replace(/\//g, "-"),
      time: timeStr,
      datetime: new Date(`${dateStr.replace(/\//g, "-")}T${timeStr}`),
      description: description || "银行交易",
      amount,
      balance,
      type: isIncome ? "income" : "expense", // 根据金额正负判断
      counterparty: counterparty || counterpartyBank || "",
      counterpartyBank,
      voucherNumber,
      rawLine: line,
    };
  } catch (error) {
    console.error("解析交易行失败:", error, line);
    return null;
  }
}

/**
 * 判断是否为表头或页脚
 */
function isHeaderOrFooter(line) {
  const skipPatterns = [
    "中国民生银行",
    "个人账户对账单",
    "客户姓名",
    "客户账号",
    "开户机构",
    "凭证类型",
    "凭证号码",
    "摘要",
    "交易时间",
    "交易金额",
    "账户余额",
    "对方户名",
    "对方行名",
    "温馨提示",
    "打印渠道",
    "打印时间",
    "起止日期",
    "产品名称",
    "币种",
    "证件号码",
    "第.*页",
    "Page",
  ];

  for (const pattern of skipPatterns) {
    if (line.includes(pattern) || new RegExp(pattern).test(line)) {
      return true;
    }
  }

  return false;
}

/**
 * 计算汇总信息（使用精确计算）
 */
function calculateSummary(transactions) {
  const incomeTransactions = transactions.filter((t) => t.type === "income");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  const income = sumTransactions(incomeTransactions);
  const expense = sumTransactions(expenseTransactions);

  return {
    totalTransactions: transactions.length,
    incomeCount: incomeTransactions.length,
    expenseCount: expenseTransactions.length,
    totalIncome: income,
    totalExpense: expense,
    balance: subtract(income, expense),
  };
}

/**
 * 检测是否为民生银行 PDF
 */
export function isMinshengBank(text) {
  return (
    text.includes("中国民生银行") ||
    text.includes("民生银行") ||
    text.includes("CHINA MINSHENG BANK")
  );
}
