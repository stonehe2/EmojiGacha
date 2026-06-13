# EmojiGacha v2.0

一个基于 Unicode Emoji 的桌面宠物抽卡游戏，包含完整的收集、养成、里程碑和图鉴功能。

## 项目结构

```
.
├── index.html    # 主页面结构（包含所有 DOM 元素和 HTML 注释说明）
├── styles.css    # 样式表（CSS 变量主题系统、响应式设计、动画效果、可访问性）
├── data.js       # Emoji 数据（1903 个 Unicode 15.1 标准 Emoji）
├── game.js       # 游戏逻辑（抽卡、图鉴、里程碑、新手引导、数据持久化）
└── README.md
```

## 快速开始

直接双击打开 `index.html` 文件即可在浏览器中运行，无需安装任何依赖或使用构建工具。

**支持浏览器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 功能特性

### 桌宠系统

- **点击交互**: 点击桌宠获得星尘，收益 = `1 + floor(rarity/2)`（v2.0 重平衡）
- **被动收益**: 每秒获得 `稀有度 × 持有数量 / 10` 星尘
- **切换桌宠**: 点击图鉴中的宠物卡片可切换当前展示的桌宠
- **动画效果**: 点击桌宠触发弹跳动画，同时显示 +N 浮动星尘

### 抽卡系统

- **单抽**: 消耗 10 星尘，抽取 1 个 Emoji
- **十连抽**: 消耗 90 星尘（享受 10% 优惠），抽取 10 个 Emoji，直接展示结果（v2.0 优化）
- **抽卡动画**: 3D 翻转卡片效果，高稀有度卡片带发光动画（8 星新增专属 `urCardGlowMax` 动画）
- **摘要横幅**: 十连抽显示"获得了 X 个宠物，其中 Y 个新宠物"统计
- **交错淡入**: 十连抽卡片带 80ms 延迟差值的渐入动画

### Emoji 图鉴

- **海量收集**: 收录 1903 个 Unicode 15.1 标准 Emoji
- **系列筛选**: 按 Emoji 大类（如 Smileys & Emotion、Animals & Nature 等）筛选
- **稀有度筛选**: 按 1★-8★ 稀有度筛选
- **收起/展开**: 可折叠图鉴网格，节省页面空间
- **收集进度**: 根据筛选条件动态显示对应范围的收集进度
- **卡片编号**: 每个 EMOJI 卡片左上角显示全局编号
- **自定义滚动条**: 展开后固定显示 3 行，超出可滚动

### 里程碑系统（v2.0 新增）

| 里程碑 | 条件 | 奖励 |
|--------|------|------|
| 收藏新手 | 收集 10 种 | 50 ✨ |
| 收藏爱好者 | 收集 50 种 | 200 ✨ |
| 收藏达人 | 收集 100 种 | 500 ✨ |
| 收藏大师 | 收集 500 种 | 2000 ✨ |
| 收藏王者 | 收集 1000 种 | 5000 ✨ |
| 全图鉴制霸 | 收集全部 1903 种 | 10000 ✨ |

达成里程碑时会显示顶部横幅通知，图鉴区域有实时里程碑进度条。

### 新手引导（v2.0 新增）

首次访问时显示 3 步交互式气泡引导：
1. "点击宠物获得星尘！" → 高亮桌宠区域
2. "消耗星尘抽取新宠物！" → 高亮抽卡按钮
3. "在图鉴中查看你的收藏！" → 高亮图鉴区域

每步点击后自动进入下一步，完成后不再显示。

### 数据管理

- **自动保存**: 游戏数据自动保存到 localStorage（v2.0 节流写入，最多每 2 秒一次）
- **导出备份**: 下载 JSON 格式的完整游戏存档（含版本号和里程碑数据）
- **导入恢复**: 从备份文件恢复游戏进度（v2.0 完整校验）
- **重置数据**: 双重确认后清除所有进度

### 可访问性（v2.0 新增）

- **键盘支持**: Enter 键触发单抽
- **焦点可见**: 所有按钮有清晰的 `focus-visible` 金色轮廓
- **运动降级**: 支持 `prefers-reduced-motion: reduce`，关闭所有动画
- **按钮标签**: 关键按钮有 `aria-label` 属性

## 稀有度系统

稀有度按 Emoji 的 Unicode 代码点数量计算：

| 稀有度 | 代码点数 | 点击收益 | 被动收益 | 占比 | 颜色 |
|--------|---------|---------|---------|------|------|
| 1★ | 1 | +1/次 | 0.1/s | 61.7% | 灰色 |
| 2★ | 2 | +2/次 | 0.2/s | 24.4% | 蓝色 |
| 3★ | 3 | +2/次 | 0.3/s | 4.7% | 绿色 |
| 4★ | 4 | +3/次 | 0.4/s | 6.0% | 紫色 |
| 5★ | 5 | +3/次 | 0.5/s | 1.3% | 金色 |
| 6★ | 6 | +4/次 | 0.6/s | 0.6% | 粉色 |
| 7★ | 7 | +4/次 | 0.7/s | 1.0% | 玫瑰红 |
| 8★ | 8 | +5/次 | 0.8/s | 0.2% | 红色 |

### 抽卡机制

- **等概率抽取**：每个 Emoji 被抽到的概率相同（1/1903）
- **实际概率**：抽中某稀有度的概率 = 该稀有度的 Emoji 数量 / 1903

### 经济平衡（v2.0 重设计）

v2.0 将点击收益从 `rarity`（1-8）降低为 `1 + floor(rarity/2)`（1-5），原因是原设计点击收益远超被动收益（8★ 时点击 8/s vs 被动 0.8/s），破坏了放置游戏的核心体验。现在两者的比例约为 **6:1**，玩家既可以选择挂机也可以选择点击，两种玩法都有效。

## 技术栈

- **语言**: HTML5 / CSS3 / JavaScript (ES6+)
- **框架**: 无（纯原生实现）
- **数据存储**: localStorage
- **字体**: Google Fonts (Fredoka One, Nunito, Baloo 2)
- **构建工具**: 无需构建，直接运行

## 核心实现

### 性能优化（v2.0）

- **O(1) Emoji 查找**: 使用 `Map` 索引替代 `Array.find`，查找速度提升约 951 倍
- **localStorage 节流**: 被动收益写入从 1 次/秒降至最多 1 次/2 秒，页面关闭时自动刷写
- **数据导入校验**: 对 coins、ownedPets、activePet 进行完整的类型和格式校验

### 安全修复（v2.0）

- **coins 类型强转**: 防止导入字符串类型导致后续计算变成字符串拼接
- **activePet 存在性验证**: 防止导入不存在的 emoji 导致 TypeError
- **ownedPets 格式验证**: 过滤无效条目，防止 `new Map(invalid)` 抛出异常
- **事件监听器修复**: gachaOverlayEl 使用命名函数引用，防止监听器累积导致重复执行

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
- **urGlow**: 高稀有度卡片发光动画（7 星）
- **urCardGlowMax**: 最高稀有度专属发光动画（8 星，v2.0 新增）
- **floatUp**: 浮动星尘上升动画
- **gridCardFadeIn**: 十连抽卡片交错淡入动画（v2.0 新增）
- **summarySlideIn**: 抽卡结果摘要滑入动画（v2.0 新增）
- **badgePulse**: NEW 徽章脉冲动画（v2.0 新增）

### 响应式设计

支持三个断点：

- **桌面端**: > 768px（完整布局，信息面板四列横排）
- **平板端**: 540px - 768px（缩减网格）
- **手机端**: < 540px（单列按钮，信息面板两列）

### 事件监听器管理

为防止事件监听器重复绑定，采用两种策略：

1. **静态元素**：使用 `listenersInitialized` 标志，`initEventListeners()` 只调用一次
2. **动态元素**：使用命名函数 + `removeEventListener` 确保每次只绑定一个

```javascript
// 动态元素刷新（抽卡弹窗重建后调用）
refreshElements() {
  this.gachaCardEl.removeEventListener('click', this._cardClickHandler);
  this._cardClickHandler = () => this.closeGachaOverlay();
  this.gachaCardEl.addEventListener('click', this._cardClickHandler);
}
```

### DOM 重建策略

抽卡弹窗中的卡片容器（`gachaCardContainer`）会在关闭时使用 `innerHTML` 重置，
因此按钮和提示元素需要放在容器外部：

```html
<div class="gacha-result-wrapper">
  <div class="gacha-card-container">
    <!-- 卡片和设为桌宠按钮（会被重置） -->
  </div>
  <!-- 继续抽卡按钮（在容器外部，不会被清空） -->
  <div class="continue-gacha-btns">...</div>
</div>
```

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

#### 存档数据格式（v2.0）

```json
{
  "version": "2.0",
  "coins": 100,
  "ownedPets": [["😀", 1], ["🐱", 2]],
  "activePet": "😀",
  "milestones": { "10": true }
}
```

## 许可证

MIT License

## 数据来源

Emoji 数据来自 [emoji-datasource](https://www.npmjs.com/package/emoji-datasource) v15.1.0

遵循 Unicode 15.1 标准

## 更新日志

### v2.0.0

**Bug 修复**：
- 数据导入安全校验（coins 类型强制转为数字，activePet 存在性验证，ownedPets 格式过滤）
- 事件监听器累积 Bug（gachaOverlayEl 改用命名函数引用，refreshElements 可正确移除）
- renderFilters 中 allBtnClick 冗余调用 renderCollection

**设计改善**：
- 经济系统重平衡：点击收益从 `rarity` 调整为 `1 + floor(rarity/2)`（1★=1, 8★=5）
- 里程碑成就系统：10/50/100/500/1000/1903 收集奖励，含横幅通知和实时进度条
- 新手引导：首次访问 3 步交互式气泡提示
- 十连抽体验：去掉"点击查看详情"中间步骤，直接展示揭示结果 + 摘要横幅
- 信息面板：四列布局（稀有度/持有/被动收益/点击收益）
- 补齐 `.gacha-card-back.rarity-8` 样式（最高稀有度专属 `urCardGlowMax` 发光动画）

**技术优化**：
- O(1) Emoji 索引查找（Map 替代 Array.find，速度提升 ~951 倍）
- localStorage 写入节流（从每秒写入降为最多每 2 秒一次，beforeunload 自动刷写）
- localStorage 加载增强校验（coins 数字验证、ownedPets 格式过滤、activePet 存在性检查）

**可访问性**：
- 键盘支持：Enter 键触发单抽
- 运动降级：`prefers-reduced-motion: reduce` 关闭全部动画
- 焦点可见：所有按钮 `focus-visible` 金色轮廓

### v1.2.0

- 被动收益公式调整为 `稀有度 × 持有数量 / 10`
- 图鉴收集进度根据筛选条件动态显示
- 信息面板布局优化为三列横排
- 图鉴卡片添加全局编号显示
- 图鉴网格支持收起/展开切换
- 筛选标签自动换行
- 收集新 EMOJI 时进度条脉冲动画

### v1.1.0

- 等概率抽卡系统（替换权重系统）
- 修复十连抽金币多扣问题
- 修复十连抽结果页闪烁问题

### v1.0.0

- 基础抽卡系统
- 1903 个 Emoji 数据
- 完整的图鉴功能
- 数据导入导出
- 响应式设计
- 动画效果