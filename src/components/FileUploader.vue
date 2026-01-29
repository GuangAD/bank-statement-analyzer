<template>
  <div
    class="file-uploader"
    :class="{ 'is-dragging': isDragging, 'has-files': parsedFiles.length > 0 }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- 上传区域 -->
    <div class="upload-zone" v-if="!isLoading && parsedFiles.length === 0">
      <div class="upload-icon">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <h3 class="upload-title">拖拽上传 PDF 文件</h3>
      <p class="upload-hint">或点击下方按钮选择文件</p>
      <p class="upload-info">支持同时上传多个银行流水 PDF</p>

      <input
        type="file"
        ref="fileInput"
        accept=".pdf"
        multiple
        @change="onFileSelect"
        style="display: none"
      />

      <button class="btn-primary upload-btn" @click="triggerFileInput">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        选择 PDF 文件
      </button>
    </div>

    <!-- 加载状态 -->
    <div class="loading-zone" v-if="isLoading">
      <div class="loading-spinner"></div>
      <h3 class="loading-title">正在解析文件...</h3>
      <p class="loading-file">{{ currentFile }}</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <p class="progress-text">{{ progress }}%</p>
    </div>

    <!-- 已解析文件列表 -->
    <div class="parsed-zone" v-if="!isLoading && parsedFiles.length > 0">
      <div class="parsed-header">
        <h3>已解析文件</h3>
        <button class="btn-secondary add-more-btn" @click="triggerFileInput">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加更多
        </button>
      </div>

      <div class="parsed-list">
        <div class="parsed-item" v-for="file in parsedFiles" :key="file.id">
          <div class="file-icon">📄</div>
          <div class="file-info">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-meta">
              {{ file.bankName }} · {{ file.transactionCount }} 笔交易
            </span>
          </div>
          <div class="file-status">✓</div>
          <button
            class="file-delete-btn"
            @click="handleRemoveFile(file.id)"
            title="删除此文件"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <input
        type="file"
        ref="fileInput"
        accept=".pdf"
        multiple
        @change="onFileSelect"
        style="display: none"
      />
    </div>

    <!-- 错误提示 -->
    <div class="error-zone" v-if="error">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <button class="btn-secondary" @click="reset">重试</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { usePdfParser } from "../composables/usePdfParser.js";

const {
  isLoading,
  progress,
  currentFile,
  error,
  parsedFiles,
  parseFiles,
  removeFile,
  reset,
} = usePdfParser();

function handleRemoveFile(fileId) {
  if (confirm("确定要删除此文件吗？相关交易记录也将被移除。")) {
    removeFile(fileId);
  }
}

const fileInput = ref(null);
const isDragging = ref(false);

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelect(event) {
  const files = event.target.files;
  if (files && files.length > 0) {
    parseFiles(Array.from(files));
  }
  // 清空 input 以支持重复选择同一文件
  event.target.value = "";
}

function onDragOver() {
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(event) {
  isDragging.value = false;
  const files = event.dataTransfer.files;

  // 过滤非 PDF 文件
  const pdfFiles = Array.from(files).filter(
    (file) =>
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf"),
  );

  if (pdfFiles.length > 0) {
    parseFiles(pdfFiles);
  }
}
</script>

<style scoped>
.file-uploader {
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--border-color);
  padding: var(--spacing-2xl);
  text-align: center;
  transition: all var(--transition-base);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-uploader.is-dragging {
  border-color: var(--primary-color);
  background: rgba(25, 118, 210, 0.05);
  transform: scale(1.01);
}

.file-uploader.has-files {
  border-style: solid;
  border-color: var(--income-color);
  background: var(--income-bg);
}

/* 上传区域 */
.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.upload-icon {
  color: var(--primary-color);
  opacity: 0.7;
}

.upload-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.upload-hint {
  color: var(--text-secondary);
  margin: 0;
}

.upload-info {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0;
}

.upload-btn {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: 1rem;
}

/* 加载状态 */
.loading-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 400px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.loading-file {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--primary-color),
    var(--primary-light)
  );
  border-radius: 4px;
  transition: width var(--transition-base);
}

.progress-text {
  color: var(--primary-color);
  font-weight: 600;
  margin: 0;
}

/* 已解析文件 */
.parsed-zone {
  width: 100%;
}

.parsed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.parsed-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.add-more-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.parsed-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.parsed-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.file-icon {
  font-size: 1.5rem;
}

.file-info {
  flex: 1;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-weight: 500;
  color: var(--text-primary);
}

.file-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.file-status {
  color: var(--income-color);
  font-weight: bold;
}

.file-delete-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.file-delete-btn:hover {
  background: var(--expense-bg);
  color: var(--expense-color);
}

/* 错误区域 */
.error-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.error-icon {
  font-size: 2rem;
}

.error-message {
  color: var(--expense-color);
  margin: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
