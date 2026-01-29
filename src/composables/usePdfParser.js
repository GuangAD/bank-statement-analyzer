/**
 * PDF 解析组合式函数
 */

import { ref } from "vue";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseBankStatement } from "../parsers/index.js";
import { useTransactionStore } from "../stores/transactionStore.js";

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

        // 解析 PDF
        const text = await extractTextFromPdf(arrayBuffer, (pageProgress) => {
          // 计算总进度
          const fileProgress = processedFiles / totalFiles;
          const currentProgress = pageProgress / totalFiles;
          progress.value = Math.round((fileProgress + currentProgress) * 100);
        });

        // 解析银行流水
        const result = parseBankStatement(text);

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
   * 从 PDF 提取文本
   */
  async function extractTextFromPdf(arrayBuffer, onProgress) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = "";

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // 按位置排序文本项，模拟表格行
      const items = textContent.items;

      // 按 y 坐标分组（同一行）
      const rows = groupByRows(items);

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
   * 按行分组文本项
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
