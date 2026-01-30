/**
 * 工商银行（ICBC）PDF解析器
 * 支持工商银行借记账户历史明细（电子版）格式
 *
 * 注意：工商银行PDF表格被解析成按列分组的格式，需要特殊处理
 */

import { categorizeTransaction } from "../constants/categories.js";

/**
 * 检测是否为工商银行流水
 */
export function isICBCStatement(text) {
  const icbcPatterns = ["中国工商银行", "工商银行", "借记账户历史明细", "ICBC"];

  return icbcPatterns.some((pattern) => text.includes(pattern));
}

/**
 * 解析工商银行PDF
 * 策略：提取各列数据，然后按索引匹配
 */
export function parseICBCBank(text) {
  console.log("=== 工商银行解析器开始 ===");

  // 提取账户信息
  const accountInfo = extractAccountInfo(text);
  console.log("账户信息:", accountInfo);

  // 尝试两种解析策略
  let transactions = [];

  // 策略1：按列数据匹配（适用于表格被分列解析的情况）
  transactions = parseByColumns(text);

  // 如果策略1没有解析出数据，尝试策略2：按行解析
  if (transactions.length === 0) {
    console.log("策略1未解析出数据，尝试策略2：按行解析");
    transactions = parseByRows(text);
  }

  // 为每个交易添加分类
  transactions.forEach((transaction) => {
    const category = categorizeTransaction(
      transaction.description,
      transaction.counterparty,
    );
    transaction.category = category.id;
    transaction.categoryInfo = category;
  });

  console.log("最终解析出交易数:", transactions.length);

  // 计算汇总信息
  const summary = calculateSummary(transactions);

  return {
    bankName: "中国工商银行",
    accountInfo,
    transactions,
    summary,
    rawText: text, // 原始解析文本
  };
}

/**
 * 策略1：按列数据匹配
 * 适用于PDF表格被解析成按列分组的情况
 *
 * 工商银行格式特点（按行分布）：
 * - "交易日期" 行：包含所有时间 HH:MM:SS
 * - "卡号" 行：卡号后面是所有日期 YYYY-MM-DD
 * - "摘要" 行：开户 工资 利息 消费...
 * - "余额" 行：0.00 然后下一行继续 5,818.18 5,818.41...
 * - 金额在"收入/支出金额"后面或"起止日期"同行：+0.00 +0.23... +5,818.18 -24.73...
 */
function parseByColumns(text) {
  console.log("=== 尝试按列解析 ===");
  console.log("=== 原始文本 ===");
  console.log(text);
  console.log("=== 原始文本结束 ===");

  const transactions = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  console.log("=== 逐行分析 ===");
  lines.forEach((line, i) => {
    console.log(
      `行${i}: ${line.substring(0, 100)}${line.length > 100 ? "..." : ""}`,
    );
  });
  console.log("=== 逐行分析结束 ===");

  // 1. 提取时间 (HH:MM:SS格式)
  let allTimes = [];
  for (const line of lines) {
    // 从包含时间格式的行提取
    const times = line.match(/\b(\d{2}:\d{2}:\d{2})\b/g);
    if (times && times.length >= 3) {
      // 至少3个时间才认为是时间行
      allTimes.push(...times);
    }
  }
  console.log("找到的时间:", allTimes.length, allTimes.slice(0, 10));

  // 2. 提取日期 (YYYY-MM-DD格式)
  let allDates = [];
  for (const line of lines) {
    // 从包含日期格式的行提取
    const dates = line.match(/\b(\d{4}-\d{2}-\d{2})\b/g);
    if (dates && dates.length >= 3) {
      // 至少3个日期才认为是日期行
      allDates.push(...dates);
    }
  }
  console.log("找到的日期:", allDates.length, allDates.slice(0, 10));

  // 3. 从"摘要"行提取摘要
  let allDescriptions = [];
  for (const line of lines) {
    if (line.startsWith("摘要")) {
      const parts = line.split(/\s+/).filter((p) => p && p !== "摘要");
      allDescriptions.push(...parts);
    }
  }
  console.log(
    "找到的摘要:",
    allDescriptions.length,
    allDescriptions.slice(0, 10),
  );

  // 3.5 提取对方户名
  // 现在 tolerance=25 后，空值和公司名应该在同一行，顺序正确
  let allCounterparties = [];
  let inCounterpartySection = false;
  for (const line of lines) {
    if (line.startsWith("对方户名")) {
      inCounterpartySection = true;
      // 同一行可能有户名或（空）
      const parts = line.split(/\s+/).filter((p) => p && p !== "对方户名");
      // 将（空）转换为空字符串
      allCounterparties.push(...parts.map((p) => (p === "（空）" ? "" : p)));
      continue;
    }
    // 遇到"余额"行则结束对方户名区域
    if (line.startsWith("余额") || line.startsWith("对方账号")) {
      inCounterpartySection = false;
      continue;
    }
    // 在对方户名区域内，继续收集
    if (inCounterpartySection) {
      const parts = line.split(/\s+/).filter((p) => p);
      // 过滤掉日期时间等非户名内容，并将（空）转换为空字符串
      const validParts = parts
        .filter((p) => {
          return (
            !p.match(/^\d{4}-\d{2}-\d{2}$/) &&
            !p.match(/^\d{2}:\d{2}:\d{2}$/) &&
            !p.match(/^下单时间/) &&
            p.length > 1
          );
        })
        .map((p) => (p === "（空）" ? "" : p));
      allCounterparties.push(...validParts);
    }
  }
  console.log(
    "找到的对方户名:",
    allCounterparties.length,
    allCounterparties.slice(0, 10),
  );

  // 4. 收集余额 - 改进：收集所有不带符号的金额数值
  // 余额行特征：以"余额"开头，或者在余额行之后、金额行之前
  let allBalances = [];
  let inBalanceSection = false;
  for (const line of lines) {
    if (line.startsWith("余额")) {
      inBalanceSection = true;
      const amounts = line.match(/[\d,]+\.\d{2}/g);
      if (amounts) {
        allBalances.push(...amounts);
      }
      continue;
    }
    // 遇到带符号金额行则结束余额区域
    if (line.match(/[+-][\d,]+\.\d{2}/)) {
      // 这行可能同时包含余额（纯数字）和带符号金额
      // 如果还在余额区域，先提取余额
      if (inBalanceSection) {
        // 检查这行是否主要是余额（不带符号的数字多于带符号的）
        const unsignedAmounts = line.match(/(?<![+-])[\d,]+\.\d{2}/g);
        const signedAmounts = line.match(/[+-][\d,]+\.\d{2}/g);
        if (
          unsignedAmounts &&
          unsignedAmounts.length > (signedAmounts?.length || 0)
        ) {
          allBalances.push(...unsignedAmounts);
        }
      }
      inBalanceSection = false;
      continue;
    }
    // 在余额区域内，继续收集余额
    if (inBalanceSection) {
      const amounts = line.match(/[\d,]+\.\d{2}/g);
      if (amounts && amounts.length >= 3) {
        // 至少3个数字，避免误判
        allBalances.push(...amounts);
      }
    }
  }
  console.log("找到的余额:", allBalances.length, allBalances.slice(0, 10));

  // 5. 收集所有带符号金额
  let allSignedAmounts = [];
  for (const line of lines) {
    // 跳过汇总行（本页收入算术合计）
    if (
      line.includes("本页收入算术合计") ||
      line.includes("本页支出算术合计")
    ) {
      continue;
    }
    const signedAmounts = line.match(/[+-][\d,]+\.\d{2}/g);
    if (signedAmounts && signedAmounts.length >= 1) {
      console.log("金额行:", line.substring(0, 80), "=>", signedAmounts);
      allSignedAmounts.push(...signedAmounts);
    }
  }
  console.log(
    "找到的带符号金额:",
    allSignedAmounts.length,
    allSignedAmounts.slice(0, 10),
  );

  // 打印所有数据的对应关系表
  console.log("=== 数据对应表（按索引） ===");
  const maxLen = Math.max(
    allDates.length,
    allTimes.length,
    allDescriptions.length,
    allBalances.length,
    allCounterparties.length,
  );
  for (let i = 0; i < Math.min(maxLen, 35); i++) {
    console.log(
      `索引${i}: 日期=${allDates[i] || "-"} | 时间=${allTimes[i] || "-"} | 摘要=${allDescriptions[i] || "-"} | 余额=${allBalances[i] || "-"} | 对方=${allCounterparties[i] || "-"}`,
    );
  }
  console.log("=== 数据对应表结束 ===");

  // 6. 确定交易数量（使用余额数量，因为余额最可靠）
  const transactionCount = Math.min(
    allDates.length,
    allTimes.length,
    allBalances.length,
  );
  console.log("将创建交易数:", transactionCount);

  // 7. 通过余额差值计算金额并创建交易
  // 余额是交易后的余额，金额 = 当前余额 - 前一余额
  for (let i = 0; i < transactionCount; i++) {
    const currentBalance = parseFloat(allBalances[i].replace(/,/g, ""));
    const prevBalance =
      i > 0 ? parseFloat(allBalances[i - 1].replace(/,/g, "")) : 0;

    // 通过余额差计算金额
    const calculatedAmount = currentBalance - prevBalance;
    const isIncome = calculatedAmount >= 0;
    const amount = Math.abs(calculatedAmount);

    const description = allDescriptions[i] || "银行交易";
    const counterparty = allCounterparties[i] || "";

    transactions.push({
      id: `${allDates[i]}-${allTimes[i]}-${Math.random().toString(36).substr(2, 9)}`,
      date: allDates[i],
      time: allTimes[i],
      datetime: new Date(`${allDates[i]}T${allTimes[i]}`),
      description,
      amount,
      balance: currentBalance,
      type: isIncome ? "income" : "expense",
      counterparty,
      counterpartyBank: "",
      rawLine: "",
    });
  }

  console.log("按列解析结果:", transactions.length);

  // 使用 console.table 打印解析结果
  console.table(
    transactions.map((t, i) => ({
      序号: i + 1,
      日期: t.date || "-",
      时间: t.time || "-",
      摘要: t.description,
      类型: t.type,
      金额: t.amount.toFixed(2),
      余额: t.balance.toFixed(2),
      对方: (t.counterparty || "-").substring(0, 15),
    })),
  );

  return transactions;
}

/**
 * 策略2：按行解析
 * 适用于每行包含完整交易信息的情况
 */
function parseByRows(text) {
  console.log("=== 尝试按行解析 ===");

  const transactions = [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // 日期时间正则 - 匹配 2024-05-14 14:37:43 格式
  const dateTimeRegex = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过表头和非数据行
    if (isHeaderOrFooter(line)) continue;

    // 检测是否包含日期时间
    const dateMatch = line.match(dateTimeRegex);

    // 同时检测是否包含金额
    const amountMatch = line.match(/[+-]?[\d,]+\.\d{2}/);

    if (dateMatch && amountMatch) {
      const dateStr = dateMatch[1];
      const timeStr = dateMatch[2];

      // 提取金额
      const rawAmount = parseFloat(amountMatch[0].replace(/,/g, ""));
      const isIncome = rawAmount > 0 || !amountMatch[0].startsWith("-");
      const amount = Math.abs(rawAmount);

      transactions.push({
        id: `${dateStr}-${timeStr}-${Math.random().toString(36).substr(2, 9)}`,
        date: dateStr,
        time: timeStr,
        datetime: new Date(`${dateStr}T${timeStr}`),
        description: "银行交易",
        amount,
        balance: 0,
        type: isIncome ? "income" : "expense",
        counterparty: "",
        counterpartyBank: "",
        rawLine: line,
      });
    }
  }

  console.log("按行解析结果:", transactions.length);
  return transactions;
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

  // 提取卡号
  const cardMatch = text.match(/卡号[：:\s]*(\d{16,19})/);
  if (cardMatch) info.accountNumber = cardMatch[1];

  // 提取户名
  const nameMatch = text.match(/户名[：:\s]*([^\s]+)/);
  if (nameMatch) info.accountName = nameMatch[1];

  // 提取起止日期
  const periodMatch = text.match(
    /起止日期[：:\s]*(\d{4}-\d{2}-\d{2})\s*[-—~至]\s*(\d{4}-\d{2}-\d{2})/,
  );
  if (periodMatch) info.period = `${periodMatch[1]} 至 ${periodMatch[2]}`;

  return info;
}

/**
 * 判断是否为表头或页脚
 */
function isHeaderOrFooter(line) {
  const skipPatterns = [
    "中国工商银行",
    "借记账户历史明细",
    "电子版",
    "交易日期",
    "收入/支出金额",
    "对方户名",
    "对方账号",
    "渠道",
    "起止日期",
    "第.*页",
    "共.*页",
    "请扫描二维码",
  ];

  for (const pattern of skipPatterns) {
    if (line.includes(pattern) || new RegExp(pattern).test(line)) {
      return true;
    }
  }

  return false;
}

/**
 * 计算汇总信息
 */
function calculateSummary(transactions) {
  const incomeTransactions = transactions.filter((t) => t.type === "income");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: transactions.length,
    incomeCount: incomeTransactions.length,
    expenseCount: expenseTransactions.length,
  };
}
