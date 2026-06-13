/**
 * EmojiGacha - 核心游戏逻辑 v2.0
 * 
 * 一个基于 Unicode Emoji 的桌面宠物抽卡游戏。
 * 包含 1903 个 Unicode 15.1 标准 Emoji，涵盖收集、养成和图鉴功能。
 * 
 * v2.0 更新：
 * - 数据导入安全校验（coins 类型强转、activePet 存在性验证、ownedPets 格式验证）
 * - 经济系统重平衡（点击收益 = 1 + floor(rarity/2)，降低点击/被动收益比）
 * - 里程碑成就系统（10/50/100/500/1000/1903 收集奖励）
 * - 新手引导（首次访问 3 步气泡提示）
 * - O(1) Emoji 索引查找（Map 替代 Array.find）
 * - localStorage 写入节流（最多每 2 秒写入一次）
 * - 键盘支持（Enter 触发单抽）
 * - 事件监听器累积 Bug 修复（gachaOverlayEl 使用命名函数引用）
 * - renderFilters 冗余渲染修复
 * - 页面关闭时自动刷写待保存数据
 * 
 * 主要功能：
 * - 桌宠点击交互（获得星尘）
 * - 被动收益系统（每秒自动产出）
 * - 抽卡系统（单抽和十连抽）
 * - 图鉴系统（系列和稀有度筛选）
 * - 数据持久化（localStorage 和导入导出）
 * 
 * @fileoverview 游戏主逻辑，包含所有游戏机制、数据管理和 UI 渲染
 * @version 2.0.0
 * @since 2025-01
 */

/**
 * 游戏主类
 * 管理游戏状态、抽卡系统、图鉴系统和数据持久化
 * 
 * @class
 * @example
 * const game = new EmojiGacha(); // 自动初始化并启动游戏
 */
class EmojiGacha {
  /**
   * 构造函数 - 初始化游戏
   * 加载存档、构建索引、绑定事件、启动被动收益循环
   * 
   * 初始化流程：
   * 1. 初始化实例属性（星尘、宠物列表、当前桌宠等）
   * 2. 构建 Emoji 索引 Map（O(1) 查找）
   * 3. 加载 localStorage 存档（若无则创建新游戏）
   * 4. 获取 DOM 元素引用
   * 5. 绑定事件监听器
   * 6. 启动被动收益循环
   * 7. 渲染初始界面
   * 8. 检查是否需要显示新手引导
   */
  constructor() {
    this.coins = 0;                          // 星尘（游戏货币）
    this.ownedPets = new Map();              // 已拥有的 Emoji 及其数量
    this.activePet = null;                   // 当前展示的桌宠
    this.lastGachaPet = null;                // 最后一次抽到的 Emoji
    this.currentSeriesFilter = 'all';        // 当前系列筛选条件
    this.currentRarityFilter = 'all';        // 当前稀有度筛选条件
    this.listenersInitialized = false;       // 事件监听器初始化标志，防止重复绑定
    this.milestones = {};                    // 已解锁的里程碑 { '10': true, '50': true, ... }

    // === 事件处理器引用（用于 removeEventListener） ===
    this._cardClickHandler = null;           // 卡片点击处理器
    this._setPetClickHandler = null;         // 设为桌宠按钮点击处理器
    this._overlayClickHandler = null;        // 遮罩层点击处理器
    this._gachaOverlayClickHandler = null;   // 抽卡遮罩层点击处理器（命名引用，可被 removeEventListener 移除）

    // === 节流保存 ===
    this._saveTimer = null;                  // 防抖定时器
    this._savePending = false;               // 是否有待写入的数据

    // === Emoji 索引 Map：O(1) 查找（v2.0 优化） ===
    // 结构：emoji -> { data: [原始数组], index: 全局编号(1-based) }
    this._emojiIndex = new Map(
      EMOJI_DATA.map((pet, idx) => [pet[0], { data: pet, index: idx }])
    );

    this.loadGame();                         // 加载存档
    this.initElements();                     // 初始化 DOM 元素引用
    this.initEventListeners();               // 绑定事件监听器
    this.listenersInitialized = true;
    this.startIncomeLoop();                  // 启动被动收益循环
    this.render();                           // 渲染初始界面
    this.checkOnboarding();                  // 检查新手引导
  }

  // ==========================================
  // 数据索引（v2.0：Map 替代 Array.find）
  // ==========================================

  /**
   * 根据 Emoji 字符查找对应的数据（O(1)）
   * @param {string} emoji - Emoji 字符
   * @returns {Array|null} - Emoji 数据数组 或 null
   */
  getPetData(emoji) {
    const entry = this._emojiIndex.get(emoji);
    return entry ? entry.data : null;
  }

  /**
   * 获取 Emoji 的全局编号（1-based）
   * @param {string} emoji - Emoji 字符
   * @returns {number} - 编号
   */
  getPetIndex(emoji) {
    const entry = this._emojiIndex.get(emoji);
    return entry ? entry.index + 1 : 0;
  }

  /**
   * 计算稀有度
   * 根据 Unicode 代码点数量确定稀有度
   * @param {string} code - 空格分隔的代码点字符串
   * @returns {number} - 稀有度星级（1-8）
   */
  calculateRarity(code) {
    return code.split(/\s+/).length;
  }

  /**
   * 获取所有 Emoji 系列（大类）列表
   * @returns {Array} - 排序后的系列名称数组
   */
  getSeriesList() {
    const series = new Set();
    EMOJI_DATA.forEach(pet => series.add(pet[3]));
    return Array.from(series).sort();
  }

  /**
   * 获取指定系列下的子分类列表
   * @param {string} series - 系列名称
   * @returns {Array} - 排序后的子分类名称数组
   */
  getSubcategoryList(series) {
    const subcats = new Set();
    EMOJI_DATA.filter(pet => pet[3] === series).forEach(pet => subcats.add(pet[4]));
    return Array.from(subcats).sort();
  }

  // ==========================================
  // 数据持久化（v2.0：节流写入 + flushOnUnload）
  // ==========================================

  /**
   * 执行实际的 localStorage 写入（内部方法）
   * 确保 coins 为数字类型、数据结构完整
   */
  _doSave() {
    const data = {
      coins: Number(this.coins) || 0,
      ownedPets: Array.from(this.ownedPets.entries()),
      activePet: this.activePet,
      milestones: this.milestones
    };
    localStorage.setItem('gachaGame', JSON.stringify(data));
    this._savePending = false;
  }

  /**
   * 保存游戏到 localStorage（v2.0：节流版）
   * 
   * 策略：
   * - immediate=true：立即写入（用于关键操作如抽卡、导入、重置）
   * - immediate=false（默认）：节流写入，最多每 2 秒一次（用于被动收益）
   * 
   * @param {boolean} immediate - 是否立即写入
   */
  saveGame(immediate = false) {
    if (immediate) {
      if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
      this._doSave();
      return;
    }
    // 节流模式：如果已有定时器，跳过本次写入
    if (this._saveTimer) return;
    this._savePending = true;
    this._saveTimer = setTimeout(() => {
      this._doSave();
      this._saveTimer = null;
    }, 2000);
  }

  /**
   * 强制刷写所有待保存数据
   * 用于页面关闭（beforeunload）和导出备份前
   */
  _flushSave() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (this._savePending) {
      this._doSave();
    }
  }

  /**
   * 从 localStorage 加载游戏存档（v2.0：增强校验）
   * 若无存档则初始化新游戏
   * 
   * 校验内容：
   * - coins 是否为数字
   * - ownedPets 是否为数组且元素格式正确
   * - activePet 是否存在于 EMOJI_DATA 中
   * - milestones 是否存在
   */
  loadGame() {
    const saved = localStorage.getItem('gachaGame');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // 类型安全：coins 强制转为数字
        this.coins = Number(data.coins);
        if (isNaN(this.coins) || this.coins < 0) this.coins = 0;

        // 格式安全：ownedPets 必须是数组且元素为 [emoji, count]
        let entries = [];
        if (Array.isArray(data.ownedPets)) {
          entries = data.ownedPets.filter(
            entry => Array.isArray(entry) && entry.length >= 2 && this._emojiIndex.has(entry[0])
          );
        }
        this.ownedPets = new Map(entries);

        // 存在性安全：activePet 必须存在于 EMOJI_DATA
        if (data.activePet && this._emojiIndex.has(data.activePet)) {
          this.activePet = data.activePet;
        } else if (this.ownedPets.size > 0) {
          this.activePet = [...this.ownedPets.keys()][0];
        } else {
          this.activePet = EMOJI_DATA[0][0];
          this.ownedPets.set(EMOJI_DATA[0][0], 1);
        }

        // 里程碑数据
        this.milestones = data.milestones || {};
      } catch (e) {
        console.error('Failed to load game:', e);
        this.initNewGame();
      }
    } else {
      this.initNewGame();
    }
  }

  /**
   * 初始化新游戏
   * 初始状态：100 星尘，默认拥有 😀
   */
  initNewGame() {
    this.coins = 100;
    this.activePet = EMOJI_DATA[0][0];
    this.ownedPets = new Map();
    this.ownedPets.set(EMOJI_DATA[0][0], 1);
    this.milestones = {};
  }

  // ==========================================
  // 桌宠交互（v2.0：重平衡点击收益）
  // ==========================================

  /**
   * 处理桌宠点击（v2.0：收益 = 1 + floor(rarity/2)）
   * 1★ = 1,  2★ = 2,  3★ = 2,  4★ = 3
   * 5★ = 3,  6★ = 4,  7★ = 4,  8★ = 5
   */
  handlePetClick() {
    if (!this.activePet) return;
    const petData = this.getPetData(this.activePet);
    if (!petData) return;

    const rarity = this.calculateRarity(petData[1]);
    const reward = 1 + Math.floor(rarity / 2);
    this.coins += reward;
    this.saveGame();
    this.updateCoinDisplay();
    this.showFloatingCoin(reward);
    this.animatePet();
  }

  /**
   * 显示浮动星尘动画
   * @param {number} amount - 获得的星尘数量
   */
  showFloatingCoin(amount) {
    const coin = document.createElement('div');
    coin.className = 'floating-coin';
    coin.textContent = `+${amount}`;
    const rect = this.petContainerEl.getBoundingClientRect();
    coin.style.left = `${rect.left + rect.width / 2 - 20}px`;
    coin.style.top = `${rect.top + rect.height / 2}px`;
    this.floatingCoinsEl.appendChild(coin);
    setTimeout(() => coin.remove(), 1000);
  }

  /**
   * 触发桌宠弹跳动画
   */
  animatePet() {
    this.petEmojiEl.classList.remove('clicked');
    void this.petEmojiEl.offsetWidth; // 强制重排
    this.petEmojiEl.classList.add('clicked');
  }

  // ==========================================
  // UI 更新
  // ==========================================

  /**
   * 更新星尘显示
   */
  updateCoinDisplay() {
    this.coinAmountEl.textContent = Math.floor(this.coins * 1000) / 1000;
    this.coinAmountEl.classList.remove('bump');
    void this.coinAmountEl.offsetWidth;
    this.coinAmountEl.classList.add('bump');
    this.updateGachaButtons();
  }

  /**
   * 更新抽卡按钮状态
   */
  updateGachaButtons() {
    this.singleGachaBtn.disabled = this.coins < 10;
    this.multiGachaBtn.disabled = this.coins < 90;
  }

  // ==========================================
  // 里程碑系统（v2.0 新增）
  // ==========================================

  /**
   * 检查并解锁里程碑
   * 当已收集的宠物数量达到里程碑阈值时触发奖励
   * 
   * 里程碑定义：
   * - 10 种 →  50 ✨
   * - 50 种 → 200 ✨
   * - 100 种 → 500 ✨
   * - 500 种 → 2000 ✨
   * - 1000 种 → 5000 ✨
   * - 1903 种 → 10000 ✨
   */
  checkMilestones() {
    const totalOwned = this.ownedPets.size;
    const milestoneDefs = [
      { count: 10, reward: 50, title: '收藏新手' },
      { count: 50, reward: 200, title: '收藏爱好者' },
      { count: 100, reward: 500, title: '收藏达人' },
      { count: 500, reward: 2000, title: '收藏大师' },
      { count: 1000, reward: 5000, title: '收藏王者' },
      { count: 1903, reward: 10000, title: '全图鉴制霸' },
    ];
    for (const m of milestoneDefs) {
      const key = String(m.count);
      if (totalOwned >= m.count && !this.milestones[key]) {
        this.milestones[key] = true;
        this.coins += m.reward;
        this.saveGame(true);
        this.showMilestoneBanner(m);
        break; // 一次只弹一个
      }
    }
  }

  /**
   * 显示里程碑达成横幅
   * @param {Object} milestone - 里程碑定义 { count, reward, title }
   */
  showMilestoneBanner(milestone) {
    const banner = document.getElementById('milestoneBanner');
    if (!banner) return;
    const icon = document.getElementById('milestoneIcon');
    const title = document.getElementById('milestoneTitle');
    const reward = document.getElementById('milestoneReward');
    if (icon) icon.textContent = '🎉';
    if (title) title.textContent = milestone.title;
    if (reward) reward.textContent = `收集了 ${milestone.count} 种宠物！获得 ${milestone.reward} ✨ 奖励`;
    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
    }, 4000);
  }

  // ==========================================
  // 新手引导（v2.0 新增）
  // ==========================================

  /**
   * 检查是否需要显示新手引导
   * 条件：从未引导过 且 且玩家还没有手动玩过（只有初始宠物）
   */
  checkOnboarding() {
    if (localStorage.getItem('gachaOnboarded')) return;
    // 如果玩家已经有超过 1 种宠物或星尘不是初始值，跳过引导
    if (this.ownedPets.size > 1 || this.coins !== 100) {
      localStorage.setItem('gachaOnboarded', '1');
      return;
    }
    this._startOnboarding();
  }

  /**
   * 启动新手引导（3 步）
   * 步骤：
   * 1. "点击宠物获得星尘！" → 高亮桌宠区域
   * 2. "消耗星尘抽取新宠物！" → 高亮抽卡按钮
   * 3. "在图鉴中查看你的收藏！" → 高亮图鉴区域
   */
  _startOnboarding() {
    this._onboardingStep = 0;
    this._onboardingSteps = [
      { target: 'petContainer', text: '点击宠物获得星尘！' },
      { target: 'singleGacha', text: '消耗星尘抽取新宠物！' },
      { target: 'collectionSection', text: '在图鉴中查看你的收藏！' },
    ];

    const showStep = () => {
      if (this._onboardingStep >= this._onboardingSteps.length) {
        this._finishOnboarding();
        return;
      }
      const tooltip = document.getElementById('onboardingTooltip');
      const textEl = document.getElementById('onboardingText');
      if (!tooltip || !textEl) return;

      const step = this._onboardingSteps[this._onboardingStep];
      const target = document.getElementById(step.target);
      if (!target) return;

      textEl.textContent = `${this._onboardingStep + 1}/3 · ${step.text}`;
      const tr = target.getBoundingClientRect();
      tooltip.style.left = Math.max(12, Math.min(tr.left + tr.width / 2, window.innerWidth - 130)) + 'px';
      tooltip.style.top = (tr.top - 12) + 'px';

      // 高亮目标元素
      document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
      target.classList.add('onboarding-highlight');

      tooltip.classList.add('show');
    };

    this._advanceOnboarding = () => {
      this._onboardingStep++;
      if (this._onboardingStep >= this._onboardingSteps.length) {
        this._finishOnboarding();
      } else {
        showStep();
      }
    };

    document.addEventListener('click', this._advanceOnboarding);
    showStep();
  }

  /**
   * 完成新手引导，清理状态
   */
  _finishOnboarding() {
    const tooltip = document.getElementById('onboardingTooltip');
    if (tooltip) tooltip.classList.remove('show');
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    document.removeEventListener('click', this._advanceOnboarding);
    localStorage.setItem('gachaOnboarded', '1');
  }

  // ==========================================
  // 抽卡系统
  // ==========================================

  /**
   * 单抽
   * 消耗 10 星尘，抽取 1 个 Emoji
   */
  doSingleGacha() {
    if (this.coins < 10) return;
    this.coins -= 10;
    this.saveGame(true);
    this.updateCoinDisplay();
    const pet = this.getRandomPet();
    this.showGachaResult(pet);
  }

  /**
   * 十连抽
   * 消耗 90 星尘（优惠 10%），抽取 10 个 Emoji
   */
  doMultiGacha() {
    if (this.coins < 90) return;
    this.coins -= 90;
    this.saveGame(true);
    this.updateCoinDisplay();
    const pets = [];
    for (let i = 0; i < 10; i++) {
      pets.push(this.getRandomPet());
    }
    this.showMultiGachaResult(pets);
  }

  /**
   * 随机抽取一个 Emoji（等概率）
   * @returns {Array} - 选中的 Emoji 数据
   */
  getRandomPet() {
    return EMOJI_DATA[Math.floor(Math.random() * EMOJI_DATA.length)];
  }

  /**
   * 显示单抽结果（3D 翻转卡片动画）
   * @param {Array} pet - Emoji 数据
   */
  showGachaResult(pet) {
    this.lastGachaPet = pet;
    const rarity = this.calculateRarity(pet[1]);
    const isNew = !this.ownedPets.has(pet[0]);
    const count = (this.ownedPets.get(pet[0]) || 0) + 1;
    this.ownedPets.set(pet[0], count);

    if (!this.activePet) {
      this.activePet = pet[0];
    }

    this.saveGame();
    this.render();
    this.checkMilestones();

    // 收集新 EMOJI 时触发进度条脉冲动画
    if (isNew && this.progressBarEl) {
      this.progressBarEl.classList.add('pulse');
      setTimeout(() => this.progressBarEl.classList.remove('pulse'), 600);
    }

    // 确保单抽卡片可见，隐藏网格
    if (this.gachaCardEl) this.gachaCardEl.style.display = '';
    if (this.setPetBtnEl) this.setPetBtnEl.style.display = '';
    const container = document.getElementById('gachaCardContainer');
    const grid = container.querySelector('.gacha-grid-container');
    if (grid) grid.style.display = 'none';

    // 恢复静态提示文本
    const staticHint = this.gachaOverlayEl.querySelector('.gacha-result-wrapper > .close-hint');
    if (staticHint) staticHint.textContent = '点击空白处关闭';

    const petIdx = this.getPetIndex(pet[0]);
    this.gachaEmojiEl.textContent = pet[0];
    this.gachaNameEl.textContent = pet[2];
    this.gachaRarityEl.textContent = `${rarity}★`;
    this.gachaDescEl.textContent = `编号 #${petIdx}\n代码 U+${pet[1]}\n系列 ${pet[3]} / ${pet[4]}`;
    this.gachaNoteEl.textContent = isNew ? '🎉 新伙伴加入收藏！' : `已拥有 x${count}`;

    this.gachaCardBackEl.className = `gacha-card-back rarity-${rarity}`;
    this.gachaCardEl.classList.remove('flip');
    this.gachaOverlayEl.classList.add('active');

    this.showContinueBtn();

    setTimeout(() => {
      this.gachaCardEl.classList.add('flip');
    }, 100);
  }

  /**
   * 显示十连抽结果（v2.0：直接展示揭示结果，含摘要横幅）
   * 去掉了"点击卡片查看详情"的中间步骤，改为直接展示所有卡片的揭示状态
   * @param {Array} pets - 10 个抽到的 Emoji 数据
   */
  showMultiGachaResult(pets) {
    const newPets = new Set();
    const results = pets.map(pet => {
      const isNew = !this.ownedPets.has(pet[0]);
      if (isNew) newPets.add(pet[0]);
      const count = (this.ownedPets.get(pet[0]) || 0) + 1;
      this.ownedPets.set(pet[0], count);
      return { pet, rarity: this.calculateRarity(pet[1]), isNew, count };
    });

    if (!this.activePet && pets.length > 0) {
      this.activePet = pets[0][0];
    }

    this.lastGachaPet = pets[0];
    this.saveGame();
    this.render();
    this.checkMilestones();

    if (newPets.size > 0 && this.progressBarEl) {
      this.progressBarEl.classList.add('pulse');
      setTimeout(() => this.progressBarEl.classList.remove('pulse'), 600);
    }

    const container = document.getElementById('gachaCardContainer');

    // 隐藏单抽卡片
    if (this.gachaCardEl) this.gachaCardEl.style.display = 'none';
    if (this.setPetBtnEl) this.setPetBtnEl.style.display = 'none';

    // 移除旧的网格和提示
    const oldGrid = container.querySelector('.gacha-grid-container');
    if (oldGrid) oldGrid.remove();
    const oldHint = container.querySelector('.close-hint');
    if (oldHint) oldHint.remove();
    const oldSummary = container.querySelector('.gacha-summary');
    if (oldSummary) oldSummary.remove();

    // 摘要横幅
    const summaryBanner = document.createElement('div');
    summaryBanner.className = 'gacha-summary';
    summaryBanner.innerHTML = `
      <span>🎴 获得了 <strong>${pets.length}</strong> 个宠物</span>
      ${newPets.size > 0 ? `<span class="gacha-summary-new">（🆕 ${newPets.size} 个新宠物！）</span>` : ''}
    `;
    container.appendChild(summaryBanner);

    // 网格卡片（带交错淡入动画）
    const gridContainer = document.createElement('div');
    gridContainer.className = 'gacha-grid-container';

    results.forEach(({ pet, rarity, isNew, count }, index) => {
      const card = document.createElement('div');
      card.className = `gacha-grid-card rarity-${rarity}${isNew ? ' new-card' : ''}`;
      card.innerHTML = `
        ${isNew ? '<div class="gacha-grid-badge new">NEW</div>' : ''}
        <div class="gacha-grid-emoji">${pet[0]}</div>
        <div class="gacha-grid-name">${pet[2]}</div>
        <div class="gacha-grid-rarity">${rarity}★ ${count > 1 ? `x${count}` : ''}</div>
      `;
      card.style.animationDelay = `${index * 0.08}s`;
      gridContainer.appendChild(card);
    });

    container.appendChild(gridContainer);

    const staticHint = this.gachaOverlayEl.querySelector('.gacha-result-wrapper > .close-hint');
    if (staticHint) staticHint.textContent = '点击空白处关闭';

    this.showContinueBtn();
    this.gachaOverlayEl.classList.add('active');
  }

  /**
   * 显示继续抽卡按钮
   */
  showContinueBtn() {
    if (!this.continueGachaBtnsEl) return;
    this.continueSingleBtnEl.textContent = '✨ 再来一次 (10 ✨)';
    this.continueSingleBtnEl.disabled = this.coins < 10;
    this.continueSingleBtnEl.onclick = () => {
      this.closeGachaOverlay(true);
      setTimeout(() => this.doSingleGacha(), 350);
    };
    this.continueMultiBtnEl.textContent = '✨ 再来十连 (90 ✨)';
    this.continueMultiBtnEl.disabled = this.coins < 90;
    this.continueMultiBtnEl.onclick = () => {
      this.closeGachaOverlay(true);
      setTimeout(() => this.doMultiGacha(), 350);
    };
    this.continueGachaBtnsEl.style.display = 'flex';
  }

  /**
   * 隐藏继续抽卡按钮
   */
  hideContinueBtn() {
    if (!this.continueGachaBtnsEl) return;
    this.continueGachaBtnsEl.style.display = 'none';
    if (this.continueSingleBtnEl) this.continueSingleBtnEl.onclick = null;
    if (this.continueMultiBtnEl) this.continueMultiBtnEl.onclick = null;
  }

  /**
   * 关闭抽卡弹窗
   * @param {boolean} isContinue - 是否为继续抽卡模式（跳过动画延迟）
   */
  closeGachaOverlay(isContinue = false) {
    this.hideContinueBtn();
    this.gachaOverlayEl.classList.remove('active');
    const resetDelay = isContinue ? 0 : 300;
    setTimeout(() => {
      const container = document.getElementById('gachaCardContainer');
      container.innerHTML = `
        <div class="gacha-card" id="gachaCard">
          <div class="gacha-card-inner">
            <div class="gacha-card-front">
              <div class="gacha-card-front-content">
                <div class="gacha-card-front-star">⭐</div>
                <span>Unicode Emoji 揭晓中</span>
              </div>
            </div>
            <div class="gacha-card-back" id="gachaCardBack">
              <div class="gacha-card-emoji" id="gachaEmoji">😀</div>
              <div class="gacha-card-name" id="gachaName">grinning face</div>
              <div class="gacha-card-rarity" id="gachaRarity">1</div>
              <div class="gacha-card-desc" id="gachaDesc"></div>
              <div class="gacha-card-note" id="gachaNote"></div>
            </div>
          </div>
        </div>
        <button class="set-pet-btn" id="setPetBtn">设为桌宠</button>
      `;
      this.refreshElements();
    }, resetDelay);
  }

  /**
   * 刷新动态生成的 DOM 元素引用
   */
  refreshElements() {
    this.gachaCardEl = document.getElementById('gachaCard');
    this.gachaCardBackEl = document.getElementById('gachaCardBack');
    this.gachaEmojiEl = document.getElementById('gachaEmoji');
    this.gachaNameEl = document.getElementById('gachaName');
    this.gachaRarityEl = document.getElementById('gachaRarity');
    this.gachaDescEl = document.getElementById('gachaDesc');
    this.gachaNoteEl = document.getElementById('gachaNote');
    this.setPetBtnEl = document.getElementById('setPetBtn');
    this.continueGachaBtnsEl = document.getElementById('continueGachaBtns');
    this.continueSingleBtnEl = document.getElementById('continueSingleBtn');
    this.continueMultiBtnEl = document.getElementById('continueMultiBtn');

    // 移除旧监听器并绑定新的
    this.gachaCardEl.removeEventListener('click', this._cardClickHandler);
    this.setPetBtnEl.removeEventListener('click', this._setPetClickHandler);
    this.gachaOverlayEl.removeEventListener('click', this._overlayClickHandler);

    this._cardClickHandler = () => this.closeGachaOverlay();
    this._setPetClickHandler = () => this.setActivePet();
    this._overlayClickHandler = (e) => {
      if (e.target === this.gachaOverlayEl) this.closeGachaOverlay();
    };

    this.gachaCardEl.addEventListener('click', this._cardClickHandler);
    this.setPetBtnEl.addEventListener('click', this._setPetClickHandler);
    this.gachaOverlayEl.addEventListener('click', this._overlayClickHandler);
  }

  /**
   * 将抽到的 Emoji 设为当前桌宠
   */
  setActivePet() {
    if (this.lastGachaPet) {
      this.activePet = this.lastGachaPet[0];
      this.saveGame(true);
      this.render();
      this.closeGachaOverlay(true);
    }
  }

  // ==========================================
  // 设置与数据管理（v2.0：导入安全校验）
  // ==========================================

  openSettings() {
    this.settingsModalEl.classList.add('active');
    this.importPreviewEl.style.display = 'none';
  }

  closeSettings() {
    this.settingsModalEl.classList.remove('active');
    this.importPreviewEl.style.display = 'none';
  }

  /**
   * 导出游戏数据为 JSON 文件
   * v2.0：导出前刷写待保存数据确保完整
   */
  exportData() {
    this._flushSave();
    const data = {
      version: '2.0',
      timestamp: Date.now(),
      coins: this.coins,
      ownedPets: Array.from(this.ownedPets.entries()),
      activePet: this.activePet,
      milestones: this.milestones
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emojigacha-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 处理导入 JSON 备份文件（v2.0：完整校验）
   * 
   * 校验内容：
   * - coins：转为数字，NaN/负数归零
   * - ownedPets：数组且元素格式正确（[emoji, count]），过滤无效 emoji
   * - activePet：必须存在于 EMOJI_DATA 中，否则从 ownedPets 取第一个
   * - milestones：可选，不存在则初始化为空对象
   */
  handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // coins 安全转换
        let coins = Number(data.coins);
        if (isNaN(coins) || coins < 0) coins = 0;

        // ownedPets 安全过滤
        let ownedPetsEntries = [];
        if (Array.isArray(data.ownedPets)) {
          ownedPetsEntries = data.ownedPets.filter(
            entry => Array.isArray(entry) && entry.length >= 2 && this._emojiIndex.has(entry[0])
          );
        }

        // activePet 安全校验
        let activePet;
        if (data.activePet && typeof data.activePet === 'string' && this._emojiIndex.has(data.activePet)) {
          activePet = data.activePet;
        } else if (ownedPetsEntries.length > 0) {
          activePet = ownedPetsEntries[0][0];
        } else {
          activePet = EMOJI_DATA[0][0];
          ownedPetsEntries.push([EMOJI_DATA[0][0], 1]);
        }

        // 预览
        document.getElementById('previewCoins').textContent = Math.floor(coins * 1000) / 1000;
        document.getElementById('previewOwned').textContent = ownedPetsEntries.length;
        const activeEntry = this._emojiIndex.get(activePet);
        const activeName = activeEntry ? `${activeEntry.data[0]} ${activeEntry.data[2]}` : activePet;
        document.getElementById('previewActivePet').textContent = activeName;
        this.importPreviewEl.style.display = 'block';

        const confirmImport = confirm('确认导入此备份数据？当前数据将被覆盖！');
        if (confirmImport) {
          this.coins = coins;
          this.ownedPets = new Map(ownedPetsEntries);
          this.activePet = activePet;
          this.milestones = data.milestones || {};
          this.saveGame(true);
          this.render();
          this.closeSettings();
          alert('导入成功！');
        }
      } catch (err) {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  /**
   * 重置游戏数据
   * 双重确认后清除所有进度
   */
  resetGame() {
    const confirm1 = confirm('确定要重置所有数据吗？此操作不可恢复！');
    if (!confirm1) return;
    const confirm2 = confirm('再次确认：所有星尘、收藏、桌宠都将被清除！');
    if (!confirm2) return;

    this.initNewGame();
    this.saveGame(true);
    this.render();
    this.closeSettings();
    alert('游戏已重置！');
  }

  // ==========================================
  // 被动收益
  // ==========================================

  /**
   * 启动被动收益循环
   * 每秒获得：稀有度 × 持有数量 / 10 星尘
   */
  startIncomeLoop() {
    setInterval(() => {
      if (this.activePet) {
        const petData = this.getPetData(this.activePet);
        if (petData) {
          const rarity = this.calculateRarity(petData[1]);
          const count = this.ownedPets.get(this.activePet) || 1;
          const income = rarity * count / 10;
          if (income > 0) {
            this.coins += income;
            this.saveGame(); // 节流写入
            this.updateCoinDisplay();
          }
        }
      }
    }, 1000);
  }

  // ==========================================
  // 渲染系统
  // ==========================================

  /**
   * 全面渲染界面
   */
  render() {
    this.updateCoinDisplay();
    this.renderActivePet();
    this.renderFilters();
    this.renderMilestoneProgress();
    this.renderCollection();
  }

  /**
   * 渲染当前桌宠信息面板
   * v2.0：增加点击收益显示、动态 clickHint
   */
  renderActivePet() {
    if (this.activePet) {
      const petData = this.getPetData(this.activePet);
      if (petData) {
        const rarity = this.calculateRarity(petData[1]);
        const count = this.ownedPets.get(this.activePet) || 1;
        const income = (rarity * count / 10).toFixed(1);
        const clickReward = 1 + Math.floor(rarity / 2);

        this.petEmojiEl.textContent = this.activePet;
        this.headerPetEmojiEl.textContent = this.activePet;
        this.headerPetNameEl.textContent = petData[2];
        this.activePetRarityEl.textContent = `${rarity}★`;
        this.activePetRarityEl.className = 'pet-info-value';
        this.activePetRarityEl.classList.add(`rarity-${rarity}`);
        this.activePetOwnedEl.textContent = `x${count}`;
        this.activePetRateEl.textContent = `${income} / 秒`;
        if (this.activePetClickEl) {
          this.activePetClickEl.textContent = `+${clickReward}`;
        }

        // 动态更新点击提示
        if (this.clickHintEl) {
          this.clickHintEl.textContent = `点击获得 ${clickReward} 星尘`;
        }
      }
    }
  }

  /**
   * 渲染筛选标签（v2.0：修复冗余 renderCollection 调用）
   */
  renderFilters() {
    // === 系列标签 ===
    const seriesList = this.getSeriesList();
    this.seriesTabsEl.innerHTML = seriesList.map(series => {
      const isActive = series === this.currentSeriesFilter;
      return `<button class="series-tab ${isActive ? 'active' : ''}" data-series="${series}">${series}</button>`;
    }).join('');

    this.seriesTabsEl.querySelectorAll('.series-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentSeriesFilter = tab.dataset.series;
        this.currentRarityFilter = 'all';
        this.filterAllBtnEl?.classList.remove('active');
        this.renderFilters();
        this.renderCollection();
      });
    });

    // === "全部"按钮（v2.0：移除冗余 renderCollection 调用） ===
    if (this.filterAllBtnEl) {
      this.filterAllBtnEl.replaceWith(this.filterAllBtnEl.cloneNode(true));
      this.filterAllBtnEl = document.getElementById('filterAllBtn');
      this.filterAllBtnEl.addEventListener('click', () => {
        this.currentSeriesFilter = 'all';
        this.currentRarityFilter = 'all';
        this.renderFilters();
        this.renderCollection();
      });
    }

    // === 收起/展开图鉴按钮 ===
    if (this.collectionToggleBtnEl) {
      this.collectionToggleBtnEl.replaceWith(this.collectionToggleBtnEl.cloneNode(true));
      this.collectionToggleBtnEl = document.getElementById('collectionToggleBtn');
      this.collectionToggleIconEl = document.getElementById('collectionToggleIcon');
      this.collectionGridWrapperEl = document.querySelector('.collection-grid-wrapper');
      this.collectionToggleBtnEl.addEventListener('click', () => this.toggleCollection());
    }

    // === 稀有度标签 ===
    const rarityList = [
      { value: '1', label: '1★' }, { value: '2', label: '2★' },
      { value: '3', label: '3★' }, { value: '4', label: '4★' },
      { value: '5', label: '5★' }, { value: '6', label: '6★' },
      { value: '7', label: '7★' }, { value: '8', label: '8★' }
    ];

    this.rarityTabsEl.innerHTML = rarityList.map(r => {
      const isActive = r.value === this.currentRarityFilter;
      return `<button class="rarity-tab ${isActive ? 'active' : ''}" data-rarity="${r.value}">${r.label}</button>`;
    }).join('');

    this.rarityTabsEl.querySelectorAll('.rarity-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentSeriesFilter = 'all';
        this.currentRarityFilter = tab.dataset.rarity;
        this.filterAllBtnEl?.classList.remove('active');
        this.renderFilters();
        this.renderCollection();
      });
    });

    // 更新"全部"按钮状态
    if (this.filterAllBtnEl) {
      this.filterAllBtnEl.classList.toggle('active',
        this.currentSeriesFilter === 'all' && this.currentRarityFilter === 'all');
    }
  }

  /**
   * 渲染图鉴网格（v2.0：增加 data-rarity 属性支持 CSS 合并）
   */
  renderCollection() {
    let pets = EMOJI_DATA.map((pet, idx) => ({
      emoji: pet[0],
      code: pet[1],
      name: pet[2],
      series: pet[3],
      subcategory: pet[4],
      index: idx,
      rarity: this.calculateRarity(pet[1]),
      owned: this.ownedPets.get(pet[0]) || 0
    }));

    if (this.currentSeriesFilter !== 'all') {
      pets = pets.filter(p => p.series === this.currentSeriesFilter);
    }
    if (this.currentRarityFilter !== 'all') {
      pets = pets.filter(p => p.rarity === parseInt(this.currentRarityFilter));
    }

    // 更新收集进度
    const allOwnedKeys = [...this.ownedPets.keys()];
    if (this.currentSeriesFilter === 'all' && this.currentRarityFilter === 'all') {
      this.collectionProgressEl.textContent = `${allOwnedKeys.length} / ${EMOJI_DATA.length}`;
      if (this.progressBarEl) {
        this.progressBarEl.style.width = `${(allOwnedKeys.length / EMOJI_DATA.length * 100).toFixed(2)}%`;
      }
    } else {
      const filteredPets = EMOJI_DATA.filter(pet => {
        if (this.currentSeriesFilter !== 'all' && pet[3] !== this.currentSeriesFilter) return false;
        if (this.currentRarityFilter !== 'all') {
          if (this.calculateRarity(pet[1]) !== parseInt(this.currentRarityFilter)) return false;
        }
        return true;
      });
      const filteredTotal = filteredPets.length;
      const filteredOwned = filteredPets.filter(pet => this.ownedPets.has(pet[0])).length;
      this.collectionProgressEl.textContent = `${filteredOwned} / ${filteredTotal}`;
      if (this.progressBarEl) {
        this.progressBarEl.style.width = `${(filteredOwned / filteredTotal * 100).toFixed(2)}%`;
      }
    }

    // 渲染宠物卡片（v2.0：添加 data-rarity 属性）
    this.collectionGridEl.innerHTML = pets.filter(pet => pet.owned > 0 || pet.emoji === this.activePet).map(pet => {
      const isActive = pet.emoji === this.activePet;
      const tooltip = pet.owned > 0 ? `U+${pet.code} · ${pet.series} · x${pet.owned}` : `U+${pet.code} · ${pet.series} · 未收集`;
      return `
        <div class="pet-card rarity-${pet.rarity} ${isActive ? 'active' : ''}" data-emoji="${pet.emoji}" data-rarity="${pet.rarity}" data-tooltip="${tooltip}">
          ${isActive ? '<div class="active-badge">当前</div>' : ''}
          <div class="pet-card-number">#${pet.index + 1}</div>
          <div class="pet-card-emoji">${pet.emoji}</div>
          <div class="pet-card-name">${pet.name}</div>
          <div class="pet-card-info">
            <span class="pet-card-rarity">${pet.rarity}★</span>
            ${pet.owned > 0 ? `<span class="pet-card-count">x${pet.owned}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.collectionGridEl.querySelectorAll('.pet-card').forEach(card => {
      card.addEventListener('click', () => {
        const emoji = card.dataset.emoji;
        this.activePet = emoji;
        this.saveGame(true);
        this.render();
      });
    });
  }

  /**
   * 渲染里程碑进度条（v2.0 新增）
   */
  renderMilestoneProgress() {
    const bar = document.getElementById('milestoneProgressBar');
    if (!bar) return;
    const totalOwned = this.ownedPets.size;
    const milestones = [10, 50, 100, 500, 1000, 1903];
    const nextMilestone = milestones.find(m => totalOwned < m) || 1903;
    const prevMilestone = [...milestones].reverse().find(m => m <= totalOwned) || 0;

    const progress = ((totalOwned - prevMilestone) / (nextMilestone - prevMilestone) * 100);
    bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    const label = document.getElementById('milestoneProgressLabel');
    if (label) {
      label.textContent = totalOwned >= 1903
        ? '全图鉴制霸！'
        : `${totalOwned} / ${nextMilestone} → 下一个里程碑`;
    }
  }

  /**
   * 切换图鉴网格的收起/展开状态
   */
  toggleCollection() {
    if (!this.collectionGridWrapperEl || !this.collectionToggleIconEl) return;
    this.isCollectionCollapsed = !this.isCollectionCollapsed;
    this.collectionGridWrapperEl.classList.toggle('collapsed', this.isCollectionCollapsed);
    this.collectionToggleIconEl.textContent = this.isCollectionCollapsed ? '▲' : '▼';
  }

  // ==========================================
  // 事件监听器（v2.0：修复监听器累积 Bug）
  // ==========================================

  /**
   * 初始化事件监听器
   * 
   * v2.0 修复：gachaOverlayEl 使用命名函数引用 _gachaOverlayClickHandler，
   * 确保 refreshElements() 中的 removeEventListener 可以正确移除。
   * _overlayClickHandler 与 _gachaOverlayClickHandler 指向同一函数引用，
   * 保持 refreshElements 的兼容性。
   */
  initEventListeners() {
    if (this.listenersInitialized) return;

    // === 桌宠交互 ===
    this.petContainerEl.addEventListener('click', () => this.handlePetClick());

    // === 抽卡按钮 ===
    this.singleGachaBtn.addEventListener('click', () => this.doSingleGacha());
    this.multiGachaBtn.addEventListener('click', () => this.doMultiGacha());

    // === 抽卡弹窗（使用命名引用，确保可被 removeEventListener 移除） ===
    this._gachaOverlayClickHandler = (e) => {
      if (e.target === this.gachaOverlayEl) this.closeGachaOverlay();
    };
    this.gachaOverlayEl.addEventListener('click', this._gachaOverlayClickHandler);
    // 别名引用给 refreshElements 使用
    this._overlayClickHandler = this._gachaOverlayClickHandler;

    this.gachaCardEl.addEventListener('click', () => this.closeGachaOverlay());
    this.setPetBtnEl.addEventListener('click', () => this.setActivePet());

    // === 设置弹窗 ===
    this.settingsBtnEl.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtnEl.addEventListener('click', () => this.closeSettings());
    this.settingsModalEl.addEventListener('click', (e) => {
      if (e.target === this.settingsModalEl) this.closeSettings();
    });

    // === 数据管理 ===
    this.exportBtnEl.addEventListener('click', () => this.exportData());
    this.importFileInputEl.addEventListener('change', (e) => this.handleImportFile(e));
    this.resetBtnEl.addEventListener('click', () => this.resetGame());

    // === 键盘支持：Enter 触发单抽 ===
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.gachaOverlayEl.classList.contains('active') && !this.settingsModalEl.classList.contains('active')) {
        e.preventDefault();
        this.doSingleGacha();
      }
    });
  }

  /**
   * 初始化 DOM 元素引用
   */
  initElements() {
    // === 星尘相关 ===
    this.coinAmountEl = document.getElementById('coinAmount');

    // === 桌宠展示 ===
    this.petEmojiEl = document.getElementById('petEmoji');
    this.petContainerEl = document.getElementById('petContainer');
    this.clickHintEl = document.getElementById('clickHint');

    // === 桌宠信息面板 ===
    this.headerPetEmojiEl = document.getElementById('headerPetEmoji');
    this.headerPetNameEl = document.getElementById('headerPetName');
    this.activePetRarityEl = document.getElementById('activePetRarity');
    this.activePetOwnedEl = document.getElementById('activePetOwned');
    this.activePetRateEl = document.getElementById('activePetRate');
    this.activePetClickEl = document.getElementById('activePetClick');

    // === 图鉴相关 ===
    this.collectionProgressEl = document.getElementById('collectionProgress');
    this.progressBarEl = document.getElementById('progressBar');
    this.collectionGridEl = document.getElementById('collectionGrid');
    this.seriesTabsEl = document.getElementById('seriesTabs');
    this.rarityTabsEl = document.getElementById('rarityTabs');
    this.filterAllBtnEl = document.getElementById('filterAllBtn');
    this.collectionToggleBtnEl = document.getElementById('collectionToggleBtn');
    this.collectionToggleIconEl = document.getElementById('collectionToggleIcon');
    this.collectionGridWrapperEl = document.querySelector('.collection-grid-wrapper');
    this.isCollectionCollapsed = false;

    // === 抽卡相关 ===
    this.singleGachaBtn = document.getElementById('singleGacha');
    this.multiGachaBtn = document.getElementById('multiGacha');
    this.gachaOverlayEl = document.getElementById('gachaOverlay');
    this.gachaCardEl = document.getElementById('gachaCard');
    this.gachaCardBackEl = document.getElementById('gachaCardBack');
    this.gachaEmojiEl = document.getElementById('gachaEmoji');
    this.gachaNameEl = document.getElementById('gachaName');
    this.gachaRarityEl = document.getElementById('gachaRarity');
    this.gachaDescEl = document.getElementById('gachaDesc');
    this.gachaNoteEl = document.getElementById('gachaNote');
    this.setPetBtnEl = document.getElementById('setPetBtn');
    this.continueGachaBtnsEl = document.getElementById('continueGachaBtns');
    this.continueSingleBtnEl = document.getElementById('continueSingleBtn');
    this.continueMultiBtnEl = document.getElementById('continueMultiBtn');

    // === 设置相关 ===
    this.settingsBtnEl = document.getElementById('settingsBtn');
    this.settingsModalEl = document.getElementById('settingsModal');
    this.closeSettingsBtnEl = document.getElementById('closeSettingsBtn');
    this.exportBtnEl = document.getElementById('exportBtn');
    this.importFileInputEl = document.getElementById('importFileInput');
    this.importPreviewEl = document.getElementById('importPreview');
    this.resetBtnEl = document.getElementById('resetBtn');

    // === 动画效果 ===
    this.floatingCoinsEl = document.getElementById('floatingCoins');
  }
}

// ==========================================
// 游戏入口
// ==========================================

/**
 * 创建游戏实例
 * 页面加载后立即启动游戏
 */
const game = new EmojiGacha();

// 页面关闭前刷写待保存数据
window.addEventListener('beforeunload', () => {
  game._flushSave();
});