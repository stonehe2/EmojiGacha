# EmojiGacha

一个基于 Unicode Emoji 的桌面宠物抽卡游戏，包含完整的收集、养成和图鉴功能。

## 项目结构

```
.
├── index.html    # 主页面结构（包含所有 DOM 元素和 HTML 注释说明）
├── styles.css    # 样式表（CSS 变量主题系统、响应式设计、动画效果）
├── data.js       # Emoji 数据（1903 个 Unicode 15.1 标准 Emoji）
├── game.js       # 游戏逻辑（抽卡系统、图鉴系统、数据持久化）
└── backup_*/     # 自动备份目录
```

## 快速开始

### 运行游戏

直接双击打开 `index.html` 文件即可在浏览器中运行，无需安装任何依赖或使用构建工具。

**支持浏览器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### 浏览器要求

- 需要支持 `localStorage`（用于数据持久化）
- 需要支持 CSS 变量和 Grid 布局
- 建议使用现代浏览器以获得最佳体验

## 功能特性

### 桌宠系统

- **点击交互**: 点击桌宠获得星尘，收益 = 宠物稀有度
- **被动收益**: 每秒获得 `稀有度 × 持有数量 / 10` 星尘
- **切换桌宠**: 点击图鉴中的宠物卡片可切换当前展示的桌宠
- **动画效果**: 点击桌宠触发弹跳动画，同时显示 +N 浮动星尘

### 抽卡系统

- **单抽**: 消耗 10 星尘，抽取 1 个 Emoji
- **十连抽**: 消耗 90 星尘（享受 10% 优惠），抽取 10 个 Emoji
- **抽卡动画**: 3D 翻转卡片效果，高稀有度卡片带发光动画
- **NEW 标识**: 新获得的 Emoji 会标记 "NEW" 徽章

### Emoji 图鉴

- **海量收集**: 收录 1903 个 Unicode 15.1 标准 Emoji
- **系列筛选**: 按 Emoji 大类（如 Smileys & Emotion、Animals & Nature 等）筛选
- **稀有度筛选**: 按 1★-8★ 稀有度筛选
- **收起/展开**: 可折叠图鉴网格，节省页面空间
- **收集进度**: 根据筛选条件动态显示对应范围的收集进度
- **卡片编号**: 每个 EMOJI 卡片左上角显示全局编号
- **详情展示**: 点击卡片可查看宠物详细信息
- **自定义滚动条**: 展开后固定显示 3 行，超出可滚动

### 数据管理

- **自动保存**: 游戏数据自动保存到 localStorage
- **导出备份**: 下载 JSON 格式的完整游戏存档
- **导入恢复**: 从备份文件恢复游戏进度
- **重置数据**: 双重确认后清除所有进度

## 稀有度系统

稀有度按 Emoji 的 Unicode 代码点数量计算：

| 稀有度 | 代码点数 | 基础产出 | 占比 | 颜色 |
|--------|---------|---------|------|------|
| 1★ | 1 | 0.6/s | 61.7% | 灰色 |
| 2★ | 2 | 1.0/s | 24.4% | 蓝色 |
| 3★ | 3 | 2.0/s | 4.7% | 绿色 |
| 4★ | 4 | 3.0/s | 6.0% | 紫色 |
| 5★ | 5 | 5.0/s | 1.3% | 金色 |
| 6★ | 6 | 7.0/s | 0.6% | 粉色 |
| 7★ | 7 | 10.0/s | 1.0% | 玫瑰红 |
| 8★ | 8 | 15.0/s | 0.2% | 红色 |

### 抽卡机制

- **等概率抽取**：每个 Emoji 被抽到的概率相同（1/1903）
- **实际概率**：抽中某稀有度的概率 = 该稀有度的 Emoji 数量 / 1903

## 技术栈

- **语言**: HTML5 / CSS3 / JavaScript (ES6+)
- **框架**: 无（纯原生实现）
- **数据存储**: localStorage
- **字体**: Google Fonts (Fredoka One, Nunito, Baloo 2)
- **构建工具**: 无需构建，直接运行

## 核心实现

### CSS 变量主题

使用 CSS 变量统一管理主题颜色，支持 8 种稀有度颜色系统：

```css
:root {
  --color-primary: #9370DB;
  --rarity-1: #94A3B8;
  --rarity-2: #38BDF8;
  /* ... 更多颜色变量 */
}
```

### 动画效果

- **petBounce**: 桌宠上下浮动动画
- **petClick**: 桌宠点击弹跳动画
- **coinPulse**: 星尘图标脉冲动画
- **coinBump**: 星尘数字弹跳动画
- **flip**: 3D 卡片翻转动画
- **urGlow**: 高稀有度卡片发光动画
- **floatUp**: 浮动星尘上升动画

### 响应式设计

支持三个断点：

- **桌面端**: > 768px（完整布局）
- **平板端**: 540px - 768px（缩减网格）
- **手机端**: < 540px（单列按钮）

## 开发

### 修改指南

1. **修改样式**: 编辑 `styles.css`，遵循现有注释分块结构
2. **修改逻辑**: 编辑 `game.js`，所有方法都有 JSDoc 注释
3. **修改数据**: 编辑 `data.js`，数组格式 `[emoji, code, name, category, subcategory, rate]`
4. **修改结构**: 编辑 `index.html`，所有区块都有 HTML 注释说明

### 数据格式

#### EMOJI_DATA 数组格式

```javascript
[
  [emoji字符, Unicode代码点, 名称, 大类, 子类, 基础产出率]
  // 示例：
  ["😀", "1F600", "grinning face", "Smileys & Emotion", "face-smiling", 5.0]
]
```

#### 存档数据格式

```json
{
  "coins": 100,
  "ownedPets": [["😀", 1], ["🐱", 2]],
  "activePet": "😀"
}
```

### 事件监听器管理

为防止事件监听器重复绑定，采用两种策略：

1. **静态元素**：使用 `listenersInitialized` 标志，`initEventListeners()` 只调用一次
2. **动态元素**：使用命名函数 + `removeEventListener` 确保每次只绑定一个

```javascript
// 动态元素刷新（抽卡弹窗重建后调用）
refreshElements() {
  // 先移除旧的监听器
  this.gachaCardEl.removeEventListener('click', this._cardClickHandler);
  // 绑定新的命名函数
  this._cardClickHandler = () => this.closeGachaOverlay();
  this.gachaCardEl.addEventListener('click', this._cardClickHandler);
}
```

### DOM 重建策略

抽卡弹窗中的卡片容器（`gachaCardContainer`）会在关闭时使用 `innerHTML` 重置，
因此**按钮和提示元素需要放在容器外部**，避免被销毁：

```html
<div class="gacha-result-wrapper">
  <div class="gacha-card-container">
    <!-- 卡片和设为桌宠按钮（会被重置） -->
  </div>
  <!-- 继续抽卡按钮（在容器外部，不会被清空） -->
  <div class="continue-gacha-btns">...</div>
</div>
```

十连抽网格使用 `display: none` 隐藏单抽卡片而非 `innerHTML = ''`，
这样点击网格卡片时可以复用已有的翻转卡片组件，避免 DOM 重建导致引用失效。

## 贡献

欢迎提交 Issue 和 Pull Request！

### 提交 Bug

请包含以下信息：

- 浏览器版本
- 问题复现步骤
- 预期行为和实际行为

### 功能建议

请描述：

- 功能场景
- 实现方式建议
- 可能的影响范围

## 许可证

MIT License

## 数据来源

Emoji 数据来自 [emoji-datasource](https://www.npmjs.com/package/emoji-datasource) v15.1.0

遵循 Unicode 15.1 标准

## 更新日志

### v1.2.0

- 被动收益公式调整为 `稀有度 × 持有数量 / 10`（提升 10 倍）
- 图鉴收集进度根据筛选条件动态显示对应范围
- 信息面板布局优化为三列横排（稀有度、持有、收益）
- 移除总被动收益显示，精简信息面板
- 图鉴卡片添加全局编号显示
- 图鉴网格支持收起/展开切换
- 图鉴展开后固定 3 行高度 + 自定义滚动条
- 筛选标签自动换行（不再横向滚动）
- 信息面板稀有度数值带对应颜色
- 桌宠点击即时缩小反馈（`:active` 缩放）
- 抽卡按钮 hover 发光效果
- 收集新 EMOJI 时进度条脉冲动画
- 分类标签顺序调整（全部、稀有度第一行，系列第二行）
- 收起按钮与"全部"按钮同行排列
- 移除 9★ 稀有度（数据中不存在 9★ Emoji）
- 清理旧版 `.settings-btn` 样式（已移至顶部导航）
- 清理 `.total-income-value` 残留样式
- CSS 版本号和注释更新
- 事件监听器管理优化（命名函数 + removeEventListener）
- DOM 重建策略优化

### v1.1.0

- 等概率抽卡系统（替换权重系统）
- 修复十连抽金币多扣问题
- 修复十连抽结果页闪烁问题
- 模块化项目结构

### v1.0.0

- 基础抽卡系统
- 1903 个 Emoji 数据
- 完整的图鉴功能
- 数据导入导出
- 响应式设计
- 动画效果优化
