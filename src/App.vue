<template>
  <div class="app" :data-theme="theme">
    <!-- 头部 -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-icon">🏦</span>
          <h1>银行流水智能分析</h1>
        </div>
        <div class="header-actions">
          <span
            class="privacy-badge"
            title="所有数据仅在本地处理，不会上传服务器"
          >
            🔒 隐私安全
          </span>
          <button
            class="theme-toggle"
            @click="toggleTheme"
            :title="theme === 'light' ? '切换暗色模式' : '切换亮色模式'"
          >
            {{ theme === "light" ? "🌙" : "☀️" }}
          </button>
          <button class="clear-btn" v-if="hasData" @click="clearData">
            🗑️ 清除数据
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="app-main">
      <div class="container">
        <!-- 上传区域 -->
        <section class="section upload-section">
          <FileUploader />
        </section>

        <!-- 数据展示区域 (有数据时显示) -->
        <template v-if="hasData">
          <!-- 仪表盘 -->
          <section class="section dashboard-section fade-in">
            <Dashboard />
          </section>

          <!-- 月度看板 -->
          <section class="section monthly-section fade-in">
            <MonthlyOverview />
          </section>

          <!-- 图表区域 -->
          <section class="section charts-section fade-in">
            <ChartsPanel />
          </section>

          <!-- 筛选区域 -->
          <section class="section filter-section fade-in">
            <FilterPanel />
          </section>

          <!-- 交易明细 -->
          <section class="section list-section fade-in">
            <TransactionList />
          </section>
        </template>

        <!-- 空状态提示 -->
        <section class="empty-hint" v-else>
          <div class="hint-content">
            <div class="hint-icon">📊</div>
            <h2>开始分析您的财务状况</h2>
            <p>
              上传银行流水 PDF 文件后，系统将自动解析并生成详细的收支分析报告
            </p>
            <div class="features">
              <div class="feature">
                <span class="feature-icon">🔐</span>
                <span>数据仅在本地处理，隐私安全</span>
              </div>
              <div class="feature">
                <span class="feature-icon">📈</span>
                <span>多维度图表可视化分析</span>
              </div>
              <div class="feature">
                <span class="feature-icon">🏷️</span>
                <span>智能交易分类系统</span>
              </div>
              <div class="feature">
                <span class="feature-icon">📥</span>
                <span>支持导出 Excel/CSV</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="app-footer">
      <p>银行流水智能分析工具 · 所有数据仅在浏览器中处理，安全可靠</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { useTransactionStore } from "./stores/transactionStore.js";
import FileUploader from "./components/FileUploader.vue";
import Dashboard from "./components/Dashboard.vue";
import MonthlyOverview from "./components/MonthlyOverview.vue";
import ChartsPanel from "./components/ChartsPanel.vue";
import FilterPanel from "./components/FilterPanel.vue";
import TransactionList from "./components/TransactionList.vue";

const store = useTransactionStore();

const theme = ref("light");
const hasData = computed(() => store.rawTransactions.length > 0);

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light";
}

function clearData() {
  if (confirm("确定要清除所有已解析的数据吗？")) {
    store.clearAll();
  }
}

// 页面关闭前提示
function handleBeforeUnload(e) {
  if (hasData.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

// 注册页面关闭提示
window.addEventListener("beforeunload", handleBeforeUnload);

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

/* 头部 */
.app-header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  font-size: 1.75rem;
}

.logo h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--primary-dark)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.privacy-badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  background: var(--income-bg);
  color: var(--income-color);
  border-radius: var(--radius-sm);
  cursor: help;
}

.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-color);
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  background: var(--primary-color);
}

.clear-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  background: var(--expense-bg);
  color: var(--expense-color);
  font-size: 0.875rem;
}

.clear-btn:hover {
  background: var(--expense-color);
  color: white;
}

/* 主内容 */
.app-main {
  flex: 1;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.section {
  margin-bottom: var(--spacing-xl);
}

/* 空状态提示 */
.empty-hint {
  padding: var(--spacing-2xl);
  text-align: center;
}

.hint-content {
  max-width: 600px;
  margin: 0 auto;
}

.hint-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
}

.hint-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.hint-content p {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
}

.features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  text-align: left;
}

.feature {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.feature-icon {
  font-size: 1.25rem;
}

.feature span:last-child {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* 页脚 */
.app-footer {
  padding: var(--spacing-lg);
  text-align: center;
  border-top: 1px solid var(--border-color);
  background: var(--card-bg);
}

.app-footer p {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .features {
    grid-template-columns: 1fr;
  }

  .logo h1 {
    font-size: 1rem;
  }

  .privacy-badge {
    display: none;
  }
}
</style>
