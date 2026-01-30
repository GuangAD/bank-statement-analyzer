/**
 * PDF 解析组合式函数
 */

import { ref } from "vue";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseBankStatement, detectBankType } from "../parsers/index.js";
import { useTransactionStore } from "../stores/transactionStore.js";
import { getTableMarkers } from "../constants/bankTableMarkers.js";

// 设置 PDF.js worker - 使用本地 npm 包中的 worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export function usePdfParser() {
  const isLoading = ref(false);
  const progress = ref(0);
  const currentFile = ref("");
  const error = ref(null);
  const parsedFiles = ref([]);

  const store = useTransactionStore();

  /**
   * 解析多个 PDF 文件
   */
  async function parseFiles(files) {
    if (!files || files.length === 0) return;

    isLoading.value = true;
    error.value = null;
    progress.value = 0;

    const totalFiles = files.length;
    let processedFiles = 0;

    try {
      for (const file of files) {
        currentFile.value = file.name;

        // 读取文件
        const arrayBuffer = await readFileAsArrayBuffer(file);

        // 解析 PDF（带表格区域过滤）
        const { text, bankName } = await extractTextFromPdfWithFilter(
          arrayBuffer,
          (pageProgress) => {
            const fileProgress = processedFiles / totalFiles;
            const currentProgress = pageProgress / totalFiles;
            progress.value = Math.round((fileProgress + currentProgress) * 100);
          },
        );

        // 解析银行流水（传入已检测的银行类型）
        const result = parseBankStatement(text, bankName);

        // 为每条交易添加来源文件标记
        result.transactions.forEach((t) => {
          t.sourceFile = file.name;
        });

        // 记录已解析的文件（添加唯一ID）
        const fileId = `${file.name}-${Date.now()}`;
        parsedFiles.value.push({
          id: fileId,
          name: file.name,
          bankName: result.bankName,
          transactionCount: result.transactions.length,
          summary: result.summary,
        });

        // 添加到 store
        if (processedFiles === 0) {
          store.loadParseResult(result);
        } else {
          store.appendTransactions(result.transactions);
        }

        processedFiles++;
      }

      progress.value = 100;
      currentFile.value = "";
    } catch (err) {
      console.error("PDF 解析失败:", err);
      error.value = err.message || "解析失败，请检查文件格式";
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 读取文件为 ArrayBuffer
   */
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 从 PDF 提取文本（带表格区域过滤）
   * 在解析第一页时检测银行类型，然后应用对应的表格标记过滤
   * @returns {object} { text: 提取的文本, bankName: 检测到的银行名称 }
   */
  async function extractTextFromPdfWithFilter(arrayBuffer, onProgress) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = "";
    let tableMarkers = null;
    let detectedBankName = "未知银行";

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      console.log(`=== 第 ${i} 页原始PDF数据 ===`);
      console.log(`共 ${textContent.items.length} 个文本项`);

      // 第一页时检测银行类型
      if (i === 1) {
        const firstPageText = textContent.items
          .map((item) => item.str)
          .join(" ");
        detectedBankName = detectBankType(firstPageText);
        console.log("检测到银行类型:", detectedBankName);

        tableMarkers = getTableMarkers(detectedBankName);
        console.log("表格标记配置:", tableMarkers);
      }

      // 获取文本项
      let items = textContent.items;

      // 打印含"（空）"的文本项及其坐标，分析为什么顺序被打乱
      const emptyItems = items.filter((item) => item.str.includes("（空）"));
      if (emptyItems.length > 0) {
        console.log(`=== 第 ${i} 页"（空）"项坐标 ===`);
        emptyItems.slice(0, 10).forEach((item, idx) => {
          console.log(
            `(空)项${idx}: x=${item.transform[4].toFixed(1)}, y=${item.transform[5].toFixed(1)}`,
          );
        });
      }

      // 打印公司名的坐标
      const companyItems = items.filter(
        (item) =>
          item.str.includes("北京欧倍尔") || item.str.includes("拼多多"),
      );
      if (companyItems.length > 0) {
        console.log(`=== 第 ${i} 页公司名坐标 ===`);
        companyItems.slice(0, 5).forEach((item, idx) => {
          console.log(
            `公司${idx}: x=${item.transform[4].toFixed(1)}, y=${item.transform[5].toFixed(1)} "${item.str.substring(0, 15)}..."`,
          );
        });
      }

      // 如果有表格标记，过滤表格区域
      if (tableMarkers) {
        items = filterTableRegion(items, tableMarkers, i);
        console.log(`过滤后剩余 ${items.length} 个文本项`);
      }

      // 按 y 坐标分组（同一行）
      // 注意：工商银行PDF中，同一行的空值和公司名y坐标差约20，需要增大tolerance
      const rowTolerance = detectedBankName === "工商银行" ? 25 : 5;
      const rows = groupByRows(items, rowTolerance);

      console.log(`=== 第 ${i} 页分组结果 (tolerance=${rowTolerance}) ===`);
      console.log(`共 ${rows.length} 行`);

      // 按行拼接文本
      for (const row of rows) {
        row.sort((a, b) => a.transform[4] - b.transform[4]);
        const rowText = row.map((item) => item.str).join(" ");
        fullText += rowText + "\n";
      }

      fullText += "\n--- PAGE BREAK ---\n";

      if (onProgress) {
        onProgress(i / numPages);
      }
    }

    return { text: fullText, bankName: detectedBankName };
  }

  /**
   * 从 PDF 提取文本（旧版本，不带过滤）
   * @param {ArrayBuffer} arrayBuffer - PDF文件数据
   * @param {Function} onProgress - 进度回调
   * @param {object} tableMarkers - 表格区域标记配置（可选）
   */
  async function extractTextFromPdf(
    arrayBuffer,
    onProgress,
    tableMarkers = null,
  ) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = "";

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      console.log(`=== 第 ${i} 页原始PDF数据 ===`);
      console.log(`共 ${textContent.items.length} 个文本项`);

      // 获取文本项
      let items = textContent.items;

      // 如果提供了表格标记，过滤表格区域
      if (tableMarkers) {
        items = filterTableRegion(items, tableMarkers, i);
        console.log(`过滤后剩余 ${items.length} 个文本项`);
      }

      // 按 y 坐标分组（同一行）
      const rows = groupByRows(items);

      console.log(`=== 第 ${i} 页分组结果 ===`);
      console.log(`共 ${rows.length} 行`);

      // 按行拼接文本
      for (const row of rows) {
        // 同一行内按 x 坐标排序
        row.sort((a, b) => a.transform[4] - b.transform[4]);
        const rowText = row.map((item) => item.str).join(" ");
        fullText += rowText + "\n";
      }

      fullText += "\n--- PAGE BREAK ---\n";

      if (onProgress) {
        onProgress(i / numPages);
      }
    }

    return fullText;
  }

  /**
   * 过滤表格区域的文本项
   * @param {Array} items - 原始文本项数组
   * @param {object} markers - 表格标记配置
   * @param {number} pageNum - 页码（用于日志）
   * @returns {Array} 过滤后的文本项
   */
  function filterTableRegion(items, markers, pageNum) {
    const { startMarkers, startInclusive, endMarkers, endInclusive } = markers;

    let inTableRegion = false;
    let startIdx = -1;
    let endIdx = items.length;

    // 遍历找到开始和结束位置
    for (let i = 0; i < items.length; i++) {
      const text = items[i].str.trim();

      // 检查是否匹配开始标记
      if (
        !inTableRegion &&
        startMarkers.some((marker) => text.includes(marker))
      ) {
        inTableRegion = true;
        startIdx = startInclusive ? i : i + 1;
        console.log(`第${pageNum}页: 找到开始标记 "${text}" 在项${i}`);
      }

      // 检查是否匹配结束标记
      if (inTableRegion && endMarkers.some((marker) => text.includes(marker))) {
        endIdx = endInclusive ? i + 1 : i;
        console.log(`第${pageNum}页: 找到结束标记 "${text}" 在项${i}`);
        break;
      }
    }

    if (startIdx === -1) {
      console.log(`第${pageNum}页: 未找到开始标记，返回所有数据`);
      return items;
    }

    console.log(`第${pageNum}页: 表格区域 [${startIdx}, ${endIdx})`);
    return items.slice(startIdx, endIdx);
  }

  /**
   * 按行分组文本项
   * 对于普通PDF，按y坐标分组（同一行）
   */
  function groupByRows(items, tolerance = 5) {
    const rows = [];

    for (const item of items) {
      if (!item.str.trim()) continue;

      const y = item.transform[5];

      // 查找同一行
      let found = false;
      for (const row of rows) {
        const rowY = row[0].transform[5];
        if (Math.abs(y - rowY) < tolerance) {
          row.push(item);
          found = true;
          break;
        }
      }

      if (!found) {
        rows.push([item]);
      }
    }

    // 按 y 坐标排序（从上到下，y 越大越靠上）
    rows.sort((a, b) => b[0].transform[5] - a[0].transform[5]);

    return rows;
  }

  /**
   * 按列分组文本项（用于表格型PDF，如工商银行）
   * 每一列代表一笔交易，按x坐标聚类
   * @param {Array} items - 文本项数组
   * @param {number} tolerance - x坐标容差
   * @returns {Array} 按列分组的数据
   */
  function groupByColumns(items, tolerance = 15) {
    const columns = [];

    for (const item of items) {
      if (!item.str.trim()) continue;

      const x = item.transform[4];

      // 查找同一列
      let found = false;
      for (const col of columns) {
        const colX = col[0].transform[4];
        if (Math.abs(x - colX) < tolerance) {
          col.push(item);
          found = true;
          break;
        }
      }

      if (!found) {
        columns.push([item]);
      }
    }

    // 按 x 坐标排序（从左到右）
    columns.sort((a, b) => a[0].transform[4] - b[0].transform[4]);

    // 每列内部按 y 坐标排序（从上到下）
    for (const col of columns) {
      col.sort((a, b) => b.transform[5] - a.transform[5]);
    }

    return columns;
  }
  /**
   * 重置状态
   */
  function reset() {
    isLoading.value = false;
    progress.value = 0;
    currentFile.value = "";
    error.value = null;
    parsedFiles.value = [];
  }

  /**
   * 删除单个已解析的文件
   */
  function removeFile(fileId) {
    const fileIndex = parsedFiles.value.findIndex((f) => f.id === fileId);
    if (fileIndex === -1) return;

    const file = parsedFiles.value[fileIndex];

    // 从列表中移除
    parsedFiles.value.splice(fileIndex, 1);

    // 从 store 中删除该文件的交易记录
    store.removeTransactionsByFile(file.name);

    // 如果没有文件了，重置 store
    if (parsedFiles.value.length === 0) {
      store.clearAll();
    }
  }

  return {
    isLoading,
    progress,
    currentFile,
    error,
    parsedFiles,
    parseFiles,
    removeFile,
    reset,
  };
}
