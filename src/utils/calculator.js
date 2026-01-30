/**
 * 精确计算工具模块
 * 使用 big.js 处理金额计算，避免 JavaScript 浮点数精度问题
 */

import Big from "big.js";

// 设置 Big.js 配置
Big.DP = 2; // 默认保留2位小数
Big.RM = Big.roundHalfUp; // 四舍五入

/**
 * 精确加法
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number}
 */
export function add(a, b) {
  return new Big(a || 0).plus(b || 0).toNumber();
}

/**
 * 精确减法
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number}
 */
export function subtract(a, b) {
  return new Big(a || 0).minus(b || 0).toNumber();
}

/**
 * 精确乘法
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number}
 */
export function multiply(a, b) {
  return new Big(a || 0).times(b || 0).toNumber();
}

/**
 * 精确除法
 * @param {number|string} a
 * @param {number|string} b
 * @param {number} dp - 小数位数，默认2
 * @returns {number}
 */
export function divide(a, b, dp = 2) {
  if (Number(b) === 0) return 0;
  return new Big(a || 0).div(b).round(dp).toNumber();
}

/**
 * 数组求和
 * @param {number[]} numbers
 * @returns {number}
 */
export function sum(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  return numbers.reduce((acc, num) => add(acc, num || 0), 0);
}

/**
 * 交易金额求和
 * @param {Array} transactions - 交易数组
 * @param {string} amountField - 金额字段名，默认 'amount'
 * @returns {number}
 */
export function sumTransactions(transactions, amountField = "amount") {
  if (!transactions || transactions.length === 0) return 0;
  return transactions.reduce((acc, t) => add(acc, t[amountField] || 0), 0);
}

/**
 * 计算百分比
 * @param {number} part - 部分值
 * @param {number} total - 总值
 * @param {number} dp - 小数位数，默认2
 * @returns {number}
 */
export function percentage(part, total, dp = 2) {
  if (Number(total) === 0) return 0;
  return new Big(part || 0).div(total).times(100).round(dp).toNumber();
}

/**
 * 格式化金额为固定小数位
 * @param {number|string} amount
 * @param {number} dp - 小数位数，默认2
 * @returns {number}
 */
export function round(amount, dp = 2) {
  return new Big(amount || 0).round(dp).toNumber();
}

/**
 * 取绝对值
 * @param {number|string} amount
 * @returns {number}
 */
export function abs(amount) {
  return new Big(amount || 0).abs().toNumber();
}

/**
 * 比较大小
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number} -1: a < b, 0: a === b, 1: a > b
 */
export function compare(a, b) {
  return new Big(a || 0).cmp(b || 0);
}

/**
 * 判断是否大于
 */
export function gt(a, b) {
  return compare(a, b) > 0;
}

/**
 * 判断是否大于等于
 */
export function gte(a, b) {
  return compare(a, b) >= 0;
}

/**
 * 判断是否小于
 */
export function lt(a, b) {
  return compare(a, b) < 0;
}

/**
 * 判断是否小于等于
 */
export function lte(a, b) {
  return compare(a, b) <= 0;
}

/**
 * 判断是否相等
 */
export function eq(a, b) {
  return compare(a, b) === 0;
}

// 默认导出一个计算器对象
export default {
  add,
  subtract,
  multiply,
  divide,
  sum,
  sumTransactions,
  percentage,
  round,
  abs,
  compare,
  gt,
  gte,
  lt,
  lte,
  eq,
};
