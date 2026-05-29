# Feature: feat-hourly-chart-ux 当日24小时用量图表交互优化

## Basic Information
- **ID**: feat-hourly-chart-ux
- **Name**: 当日24小时用量图表交互优化
- **Priority**: 70
- **Size**: S
- **Dependencies**: none
- **Parent**: null
- **Children**: empty
- **Created**: 2026-05-28

## Description
优化用量报表中"当日24小时用量"的两个折线图（Token 用量 & 请求次数）的交互体验：
1. **Tooltip 数据排序**：鼠标悬停到某个小时时，浮动层中的用户数据按从大到小排序，方便快速识别用量最高的用户
2. **折线名称标签**：在每条折线的末端（最后一个数据点）附近添加用户名标签，无需对照图例即可直接确认每条线对应的用户

## User Value Points
1. **Tooltip 排序** — 用户悬停时看到按用量降序排列的数据，快速定位用量最高的人
2. **折线末端标签** — 用户无需来回对照底部图例，直接在折线上看到用户名

## Context Analysis
### Reference Code
- `one-api/web/berry/src/views/Report/component/DailyHourlyChart.js` (329 行) — 唯一需修改的文件
  - 第 106-130 行：`baseOptions` (chartOptions) 包含 tooltip 和 legend 配置
  - 第 126 行：当前 tooltip 仅有 `theme` 配置，无排序逻辑
  - 第 127 行：当前 legend 在底部显示
  - 第 112 行：`USER_COLORS` 调色板用于线条颜色
  - 第 73-133 行：`useMemo` 构建 series 和 options

### Related Documents
- ApexCharts tooltip 配置文档：`tooltip.shared` + 自定义排序

### Related Features
- feat-daily-hourly-chart (已归档, 2026-05-26) — 原始 24 小时图表 feature
- feat-usage-report-v2 (已归档, 2026-05-19) — 用量报表优化
- feat-usage-chart-granularity (已归档, 2026-05-19) — 时间粒度

## Technical Solution

### 方案 1: Tooltip 数据排序
ApexCharts 的 `tooltip.shared: true` 模式下，通过自定义 `tooltip.custom` 函数对 tooltip 内容按值降序排序。

或者更简洁的方案：使用 ApexCharts 内置的 `tooltip.sortSeriesByTotal` 或在 `tooltip` 配置中使用 `items` 排序。

**实现方式：** 在 `baseOptions` 中增强 tooltip 配置：
```js
tooltip: {
  theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
  shared: true,
  intersect: false,
  custom: function({ series, seriesIndex, dataPointIndex, w }) {
    // 按 series 值降序排序，构建自定义 tooltip HTML
  }
}
```

### 方案 2: 折线末端名称标签
使用 ApexCharts 的 `annotations` 在每条线的最后一个非零数据点（或最后一个数据点）添加 text annotation。

**实现方式：** 根据 series 数据动态生成 `annotations.points` 数组：
```js
annotations: {
  points: usernames.map((username, i) => ({
    x: hours[lastDataIndex],
    y: seriesData[i][lastDataIndex],
    marker: { size: 0 },
    label: {
      text: username,
      style: { colors: ['#fff'], background: USER_COLORS[i % USER_COLORS.length] }
    }
  }))
}
```

## Acceptance Criteria (Gherkin)
### User Story
作为管理员，我希望在查看当日 24 小时用量图表时，能更直观地了解各用户的用量分布情况。

### Scenarios (Given/When/Then)

#### Scenario 1: Tooltip 数据排序
```gherkin
Given 管理员打开用量报表页面
And 选择了有多个用户数据的日期
When 鼠标悬停到折线图的某个小时刻度上
Then 浮动层显示该小时所有用户的用量数据
And 数据按用量从大到小排序
And 排名第一的是该小时用量最高的用户
```

#### Scenario 2: 折线末端名称标签
```gherkin
Given 管理员打开用量报表页面
And 选择了有数据的日期
When 折线图渲染完成
Then 每条折线的末端附近显示对应用户的用户名标签
And 标签背景颜色与折线颜色一致
And 标签文字清晰可读
```

#### Scenario 3: 单用户场景
```gherkin
Given 管理员打开用量报表页面
And 选择了只有一个用户数据的日期
When 折线图渲染完成
Then 折线末端仍显示该用户名标签
And Tooltip 正常显示该用户数据
```

#### Scenario 4: 无数据场景
```gherkin
Given 管理员打开用量报表页面
And 选择了没有任何数据的日期
When 图表区域渲染
Then 显示"暂无数据"占位
And 不出现 JavaScript 错误
```

### UI/Interaction Checkpoints
- Tooltip 悬停时，数据按降序排列
- 折线末端标签不重叠（用户 ≤8 时足够空间）
- 标签在深色/浅色主题下均可读
- 标签不遮挡图表核心数据区域

### General Checklist
- [x] 仅修改前端代码 (DailyHourlyChart.js)
- [x] 不影响后端 API
- [x] 不影响趋势图 (TrendChart) 组件

## Merge Record
- **Completed**: 2026-05-28
- **Merged Branch**: feature/hourly-chart-ux
- **Merge Commit**: d9f104bcb5040577f8268f903b6f4450ac931c21
- **Archive Tag**: feat-hourly-chart-ux-20260528
- **Conflicts**: none
- **Verification**: passed (4/4 scenarios, code analysis)
- **Files Changed**: 1 (DailyHourlyChart.js, +93 -4)
- **Duration**: same day
