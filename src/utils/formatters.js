/**
 * 格式化工具函数
 */

import dayjs from "dayjs";

/**
 * 格式化金额
 * @param {number} amount - 金额
 * @param {boolean} showSign - 是否显示正负号
 * @returns {string} 格式化后的金额字符串
 */
export function formatAmount(amount, showSign = false) {
  const formatted = Math.abs(amount).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return formatted;
}

/**
 * 格式化货币（带符号）
 * @param {number} amount - 金额
 * @param {string} currency - 货币符号
 * @returns {string} 格式化后的货币字符串
 */
export function formatCurrency(amount, currency = "¥") {
  return `${currency}${formatAmount(amount)}`;
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期
 * @param {string} format - 格式
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = "YYYY-MM-DD") {
  return dayjs(date).format(format);
}

/**
 * 格式化日期时间
 * @param {string|Date} datetime - 日期时间
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(datetime) {
  return dayjs(datetime).format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 格式化相对时间
 * @param {string|Date} date - 日期
 * @returns {string} 相对时间描述
 */
export function formatRelativeDate(date) {
  const d = dayjs(date);
  const now = dayjs();
  const diffDays = now.diff(d, "day");

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

/**
 * 格式化百分比
 * @param {number} value - 数值
 * @param {number} total - 总数
 * @returns {string} 百分比字符串
 */
export function formatPercent(value, total) {
  if (total === 0) return "0%";
  const percent = (value / total) * 100;
  return percent.toFixed(1) + "%";
}

/**
 * 缩短文本
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 缩短后的文本
 */
export function truncateText(text, maxLength = 20) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * 生成随机 ID
 * @returns {string} 随机 ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
