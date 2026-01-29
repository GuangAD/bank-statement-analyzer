# 银行流水智能分析工具

一款纯前端的银行流水 PDF 解析与可视化分析工具，帮助用户快速整理收支明细、智能分类、时间筛选，并通过丰富的图表直观展示财务状况。

## ✨ 功能特性

### 🔐 隐私安全

- **所有数据仅在浏览器端处理**，不上传任何服务器
- 页面关闭或刷新后数据自动销毁
- 无需注册，无需登录

### 📄 PDF 解析

- 支持拖拽上传或点击选择 PDF 文件
- 支持同时上传多个银行流水文件
- 自动识别银行类型（目前支持民生银行）
- 智能提取交易记录（摘要、对方户名、支付渠道等）
- 支持删除已上传的文件

### 🏷️ 智能分类

预设 22 个常用分类，自动根据交易描述智能匹配：

- 💰 工资薪酬 | 🏦 银行转账 | � 微信支付 | 🔷 支付宝
- �💳 信用卡还款 | 📈 投资理财 | 🏠 房租房贷 | 🚗 交通出行
- 🍔 餐饮美食 | 🛒 网购消费 | 🏪 线下购物 | 📱 通讯缴费
- 💡 水电燃气 | 🏥 医疗健康 | 🎓 教育培训 | 🎮 娱乐休闲
- 👔 服装配饰 | 💄 美容护理 | 🐕 宠物相关 | 🎁 人情往来
- 🔧 生活服务 | ❓ 其他

支持手动修改分类。

### 📊 数据可视化

- **收支仪表盘**：总收入、总支出、结余、收支比例
- **月度看板**：按月展示收支汇总，点击可快速筛选
- **趋势折线图**：按日/周/月查看收支趋势
- **分类饼图**：直观展示各分类占比
- **对比柱状图**：月度收支对比及结余曲线
- **日历热力图**：按年份查看每日交易密度

### 🔍 筛选查询

- 时间范围筛选（快捷选项 + 自定义）
- 月度看板一键筛选
- 收支类型筛选（全部/收入/支出）
- 分类多选筛选
- 关键词搜索

### � 交易详情

- 点击交易行展开详情
- 查看完整摘要、对方户名、支付渠道、凭证号等
- 支持添加个人备注
- 查看原始解析数据

### �📥 数据导出

- 导出 Excel (.xlsx)
- 导出 CSV (.csv)
- 包含交易明细、汇总和分类统计

### 🌓 主题切换

- 支持亮色/暗色模式切换

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

然后在浏览器中打开 http://localhost:5173/

### 构建生产版本

```bash
npm run build
```

## 🛠️ 技术栈

| 技术       | 说明       |
| ---------- | ---------- |
| Vue 3      | 前端框架   |
| Vite       | 构建工具   |
| Pinia      | 状态管理   |
| ECharts 5  | 图表库     |
| pdfjs-dist | PDF 解析   |
| Day.js     | 日期处理   |
| xlsx       | Excel 导出 |

## 📁 项目结构

```
src/
├── components/          # Vue 组件
│   ├── charts/         # 图表组件
│   │   ├── TrendChart.vue      # 趋势图
│   │   ├── CategoryPie.vue     # 分类饼图
│   │   ├── CompareBar.vue      # 对比柱状图
│   │   └── CalendarHeatmap.vue # 日历热力图
│   ├── ChartsPanel.vue         # 图表面板
│   ├── Dashboard.vue           # 仪表盘
│   ├── FileUploader.vue        # 文件上传
│   ├── FilterPanel.vue         # 筛选面板
│   ├── MonthlyOverview.vue     # 月度看板
│   └── TransactionList.vue     # 交易列表
├── composables/         # 组合式函数
│   ├── usePdfParser.js  # PDF解析逻辑
│   └── useExport.js     # 导出功能
├── constants/           # 常量配置
│   └── categories.js    # 分类定义与匹配规则
├── parsers/             # 银行解析器
│   ├── index.js         # 解析器入口
│   └── MinshengParser.js # 民生银行解析器
├── stores/              # Pinia Store
│   └── transactionStore.js # 交易数据状态
├── utils/               # 工具函数
│   └── formatters.js    # 格式化工具
├── App.vue              # 主应用组件
├── main.js              # 入口文件
└── style.css            # 全局样式
```

## 🏦 支持的银行

| 银行         | 状态      |
| ------------ | --------- |
| 中国民生银行 | ✅ 已支持 |
| 其他银行     | 🔄 计划中 |

### 扩展新银行

在 `src/parsers/` 目录下创建新的解析器：

```javascript
// NewBankParser.js
export function parseNewBank(text) {
  // 解析逻辑
  return {
    bankName: '新银行名称',
    transactions: [...],
    summary: {...}
  }
}

export function isNewBank(text) {
  return text.includes('新银行特征文本')
}
```

然后在 `src/parsers/index.js` 中注册。

## 📝 使用说明

1. 打开网页
2. 拖拽或选择银行流水 PDF 文件上传
3. 等待解析完成
4. 查看仪表盘和月度看板
5. 浏览图表分析
6. 使用筛选功能查看特定交易
7. 点击交易行查看详情，添加备注
8. 根据需要导出数据

## ⚠️ 注意事项

- 仅支持 PDF 格式的银行流水文件
- 解析准确度取决于 PDF 的文本质量
- 建议使用现代浏览器（Chrome、Firefox、Edge、Safari）
- 页面刷新或关闭后数据会丢失，请及时导出

## 📄 许可证

MIT License
