/**
 * 银行表格区域标记配置
 * 用于识别PDF中的表格数据区域，过滤页眉页脚等非表格内容
 */

export const BANK_TABLE_MARKERS = {
  icbc: {
    name: "中国工商银行",
    // 开始标记数组，匹配任一即开始收集
    startMarkers: ["交易日期"],
    // 开始标记是否包含在表格数据中
    startInclusive: true,
    // 结束标记数组，匹配任一即停止收集
    endMarkers: ["本页支出算术合计"],
    // 结束标记是否包含在表格数据中
    endInclusive: false,
  },
  minsheng: {
    name: "中国民生银行",
    startMarkers: ["凭证类型"],
    startInclusive: true,
    endMarkers: ["____", "支出交易总额"],
    endInclusive: false,
  },
};

/**
 * 根据银行名称获取标记配置
 * @param {string} bankName - 银行名称
 * @returns {object|null} 标记配置
 */
export function getTableMarkers(bankName) {
  if (bankName.includes("工商")) {
    return BANK_TABLE_MARKERS.icbc;
  }
  if (bankName.includes("民生")) {
    return BANK_TABLE_MARKERS.minsheng;
  }
  return null;
}
