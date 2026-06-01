/**
 * EmojiGacha - 核心游戏逻辑
 * 
 * 一个基于 Unicode Emoji 的桌面宠物抽卡游戏。
 * 包含 1903 个 Unicode 15.1 标准 Emoji，涵盖收集、养成和图鉴功能。
 * 
 * 主要功能：
 * - 桌宠点击交互（获得星尘）
 * - 被动收益系统（每秒自动产出）
 * - 抽卡系统（单抽和十连抽）
 * - 图鉴系统（系列和稀有度筛选）
 * - 数据持久化（localStorage 和导入导出）
 * 
 * @fileoverview 游戏主逻辑，包含所有游戏机制、数据管理和 UI 渲染
 * @author EmojiGacha Team
 * @version 1.2.0
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
   * 加载存档、绑定事件、启动被动收益循环
   * 
   * 初始化流程：
   * 1. 初始化实例属性（星尘、宠物列表、当前桌宠等）
   * 2. 加载 localStorage 存档（若无则创建新游戏）
   * 3. 获取 DOM 元素引用
   * 4. 绑定事件监听器
   * 5. 启动被动收益循环
   * 6. 渲染初始界面
   */
  constructor() {
    this.coins = 0;                          // 星尘（游戏货币）
    this.ownedPets = new Map();              // 已拥有的 Emoji 及其数量
    this.activePet = null;                   // 当前展示的桌宠
    this.lastGachaPet = null;                // 最后一次抽到的 Emoji
    this.currentSeriesFilter = 'all';        // 当前系列筛选条件
    this.currentRarityFilter = 'all';        // 当前稀有度筛选条件
    this.listenersInitialized = false;       // 事件监听器初始化标志，防止重复绑定

    // === 事件处理器引用（用于 removeEventListener） ===
    this._cardClickHandler = null;           // 卡片点击处理器
    this._setPetClickHandler = null;         // 设为桌宠按钮点击处理器
    this._overlayClickHandler = null;        // 遮罩层点击处理器

    this.loadGame();                         // 加载存档
    this.initElements();                     // 初始化 DOM 元素引用
    this.initEventListeners();               // 绑定事件监听器
    this.listenersInitialized = true;
    this.startIncomeLoop();                  // 启动被动收益循环
    this.render();                           // 渲染初始界面
  }

  /**
   * 初始化 DOM 元素引用
   * 获取所有需要用到的 HTML 元素并保存为实例属性
   * 
   * 按功能模块分组：
   * - 星尘相关
   * - 桌宠展示
   * - 桌宠信息面板
   * - 图鉴相关
   * - 抽卡相关（包括继续抽卡按钮）
   * - 设置相关
   * - 动画效果
   * 
   * @important 此方法会在页面加载时调用一次，
   *            抽卡弹窗 DOM 重建后通过 refreshElements() 重新获取引用
   */
  initElements() {
    // === 星尘相关 ===
    this.coinAmountEl = document.getElementById('coinAmount');

    // === 桌宠展示 ===
    this.petEmojiEl = document.getElementById('petEmoji');
    this.petContainerEl = document.getElementById('petContainer');

    // === 桌宠信息面板 ===
    this.headerPetEmojiEl = document.getElementById('headerPetEmoji');
    this.headerPetNameEl = document.getElementById('headerPetName');
    this.activePetRarityEl = document.getElementById('activePetRarity');
    this.activePetOwnedEl = document.getElementById('activePetOwned');
    this.activePetRateEl = document.getElementById('activePetRate');

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

  /**
   * 初始化事件监听器
   * 使用 listenersInitialized 标志防止重复绑定
   * 
   * 绑定以下事件：
   * - 桌宠点击：handlePetClick()
   * - 抽卡按钮：doSingleGacha(), doMultiGacha()
   * - 抽卡弹窗：点击空白处关闭、点击卡片关闭
   * - 设置弹窗：打开/关闭/点击空白处关闭
   * - 数据管理：导出/导入/重置
   * 
   * @important 此方法只会被调用一次。
   *             抽卡弹窗重建后使用 refreshElements() 刷新动态元素的引用，
   *             并使用命名函数 + removeEventListener 避免监听器累积。
   */
  initEventListeners() {
    // 已初始化则跳过，避免事件监听器累积导致重复触发
    if (this.listenersInitialized) return;
    
    // === 桌宠交互 ===
    this.petContainerEl.addEventListener('click', () => this.handlePetClick());

    // === 抽卡按钮 ===
    this.singleGachaBtn.addEventListener('click', () => this.doSingleGacha());
    this.multiGachaBtn.addEventListener('click', () => this.doMultiGacha());

    // === 抽卡弹窗 ===
    this.gachaOverlayEl.addEventListener('click', (e) => {
      if (e.target === this.gachaOverlayEl) this.closeGachaOverlay();
    });
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
  }

  /**
 * 从 localStorage 加载游戏存档
 * 若无存档则初始化新游戏（100 星尘，默认拥有第一个 Emoji）
 * 
 * 存档数据结构：
 * {
 *   coins: number,
 *   ownedPets: Array<[emoji, count]>,
 *   activePet: string | null
 * }
 * 
 * @throws {Error} JSON 解析失败时捕获错误并打印日志
 */
  loadGame() {
    const saved = localStorage.getItem('gachaGame');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.coins = data.coins || 0;
        this.ownedPets = new Map(data.ownedPets || []);
        this.activePet = data.activePet || null;
      } catch (e) {
        console.error('Failed to load game:', e);
      }
    } else {
      // 新游戏初始化
      this.coins = 100;
      this.activePet = EMOJI_DATA[0][0];
      this.ownedPets.set(EMOJI_DATA[0][0], 1);
    }
  }

  /**
   * 保存游戏到 localStorage
   * 保存星尘、已拥有宠物列表和当前桌宠
   * 
   * 存档时机：
   * - 每次抽卡后
   * - 点击桌宠获得星尘后
   * - 切换桌宠后
   * - 被动收益循环（每秒）
   * 
   * 注意：由于 localStorage 是同步 API，频繁调用可能影响性能
   */
  saveGame() {
    const data = {
      coins: this.coins,
      ownedPets: Array.from(this.ownedPets.entries()),
      activePet: this.activePet
    };
    localStorage.setItem('gachaGame', JSON.stringify(data));
  }

  /**
   * 根据 Emoji 字符查找对应的数据
   * 
   * @param {string} emoji - Emoji 字符，如 "😀"
   * @returns {Array|null} - Emoji 数据数组 [emoji, code, name, category, subcategory, rate] 或 null
   * @example
   * const data = this.getPetData("😀");
   * // 返回: ["😀", "1F600", "grinning face", "Smileys & Emotion", "face-smiling", 5.0]
   */
  getPetData(emoji) {
    return EMOJI_DATA.find(p => p[0] === emoji);
  }

  /**
   * 计算稀有度
   * 根据 Unicode 代码点数量确定稀有度（U+ 代码数量）
   * @param {string} code - 空格分隔的代码点字符串，如 "1F600" 或 "1F600 1F3FB"
   * @returns {number} - 稀有度星级（1-9）
   */
  calculateRarity(code) {
    const codes = code.split(/\s+/);
    return codes.length;
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
  // 桌宠交互
  // ==========================================

  /**
   * 处理桌宠点击
   * 点击桌宠获得等于稀有度的星尘
   */
  handlePetClick() {
    if (!this.activePet) return;
    const petData = this.getPetData(this.activePet);
    if (!petData) return;

    const rarity = this.calculateRarity(petData[1]);
    this.coins += rarity;
    this.saveGame();
    this.updateCoinDisplay();
    this.showFloatingCoin(rarity);
    this.animatePet();
  }

  /**
   * 显示浮动星尘动画
   * 在桌宠位置弹出 +N 动画效果
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
   * 通过移除并重新添加 clicked 类来触发动画
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
   * 显示保留三位小数，并触发数字弹跳动画
   */
  updateCoinDisplay() {
    this.coinAmountEl.textContent = Math.floor(this.coins * 1000) / 1000;
    this.coinAmountEl.classList.remove('bump');
    void this.coinAmountEl.offsetWidth; // 强制重排
    this.coinAmountEl.classList.add('bump');
    this.updateGachaButtons();
  }

  /**
   * 更新抽卡按钮状态
   * 星尘不足时禁用对应按钮
   */
  updateGachaButtons() {
    this.singleGachaBtn.disabled = this.coins < 10;
    this.multiGachaBtn.disabled = this.coins < 90;
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
    this.saveGame();
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
    this.saveGame();
    this.updateCoinDisplay();
    const pets = [];
    for (let i = 0; i < 10; i++) {
      pets.push(this.getRandomPet());
    }
    this.showMultiGachaResult(pets);
  }

  /**
   * 随机抽取一个 Emoji
   * 等概率抽取：每个 Emoji 被抽到的概率相同（1/1903）
   * 
   * 算法：直接随机选择数组索引
   * 
   * @returns {Array} - 选中的 Emoji 数据 [emoji, code, name, category, subcategory, rate]
   */
  getRandomPet() {
    const randomIdx = Math.floor(Math.random() * EMOJI_DATA.length);
    return EMOJI_DATA[randomIdx];
  }

  /**
   * 显示单抽结果
   * 增加宠物数量、更新存档、展示 3D 翻转卡片动画
   * 
   * 流程：
   * 1. 记录抽到的宠物到 lastGachaPet
   * 2. 计算稀有度和是否为新宠物
   * 3. 更新 ownedPets 数量
   * 4. 若无当前桌宠，自动设置为抽到的宠物
   * 5. 保存并渲染界面
   * 6. 更新卡片内容并触发翻转动画
   * 
   * @param {Array} pet - 抽到的 Emoji 数据 [emoji, code, name, category, subcategory, rate]
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

    // 更新卡片内容
    this.gachaEmojiEl.textContent = pet[0];
    this.gachaNameEl.textContent = pet[2];
    this.gachaRarityEl.textContent = `${rarity}★`;
    this.gachaDescEl.textContent = `编号 #${EMOJI_DATA.indexOf(pet) + 1}\n代码 U+${pet[1]}\n系列 ${pet[3]} / ${pet[4]}`;
    this.gachaNoteEl.textContent = isNew ? '🎉 新伙伴加入收藏！' : `已拥有 x${count}`;

    // 设置稀有度颜色并触发翻转动画
    this.gachaCardBackEl.className = `gacha-card-back rarity-${rarity}`;
    this.gachaCardEl.classList.remove('flip');
    this.gachaOverlayEl.classList.add('active');

    // 显示继续单抽按钮
    this.showContinueBtn();

    setTimeout(() => {
      this.gachaCardEl.classList.add('flip');
    }, 100);
  }

  /**
   * 显示十连抽中单个卡片的详情
   * 仅展示动画，不增加数量（数量已在 showMultiGachaResult 中处理）
   * @param {Array} pet - 要展示的 Emoji 数据
   */
  showGachaResultDetail(pet) {
    this.lastGachaPet = pet;
    const rarity = this.calculateRarity(pet[1]);
    const isNew = !this.ownedPets.has(pet[0]);
    const count = this.ownedPets.get(pet[0]) || 0;

    // 隐藏网格容器，显示单抽卡片
    const container = document.getElementById('gachaCardContainer');
    const grid = container.querySelector('.gacha-grid-container');
    if (grid) grid.style.display = 'none';
    if (this.gachaCardEl) this.gachaCardEl.style.display = '';
    if (this.setPetBtnEl) this.setPetBtnEl.style.display = '';

    // 恢复静态提示文本
    const staticHint = this.gachaOverlayEl.querySelector('.gacha-result-wrapper > .close-hint');
    if (staticHint) staticHint.textContent = '点击空白处关闭';

    this.gachaEmojiEl.textContent = pet[0];
    this.gachaNameEl.textContent = pet[2];
    this.gachaRarityEl.textContent = `${rarity}★`;
    this.gachaDescEl.textContent = `编号 #${EMOJI_DATA.indexOf(pet) + 1}\n代码 U+${pet[1]}\n系列 ${pet[3]} / ${pet[4]}`;
    this.gachaNoteEl.textContent = isNew ? '🎉 新伙伴加入收藏！' : `已拥有 x${count}`;

    this.gachaCardBackEl.className = `gacha-card-back rarity-${rarity}`;
    this.gachaCardEl.classList.remove('flip');
    this.gachaOverlayEl.classList.add('active');

    // 显示继续抽卡按钮
    this.showContinueBtn();

    setTimeout(() => {
      this.gachaCardEl.classList.add('flip');
    }, 100);
  }

  /**
   * 显示十连抽结果
   * 批量更新 10 个宠物的数量，展示网格卡片视图
   * 
   * 注意：不销毁单抽卡片 DOM，而是通过 display 样式隐藏。
   * 这样点击网格卡片时，showGachaResultDetail() 可以直接复用已有的翻转卡片组件，
   * 避免 DOM 重建导致的引用失效问题。
   * 
   * @param {Array} pets - 10 个抽到的 Emoji 数据
   */
  showMultiGachaResult(pets) {
    // 批量增加所有宠物数量
    const newPets = new Set();
    pets.forEach(pet => {
      const isNew = !this.ownedPets.has(pet[0]);
      if (isNew) newPets.add(pet[0]);
      const count = (this.ownedPets.get(pet[0]) || 0) + 1;
      this.ownedPets.set(pet[0], count);
    });

    // 若无当前桌宠，默认设为第一个抽到的
    if (!this.activePet && pets.length > 0) {
      this.activePet = pets[0][0];
    }

    this.lastGachaPet = pets[0];
    this.saveGame();
    this.render();

    // 收集新 EMOJI 时触发进度条脉冲动画
    if (newPets.size > 0 && this.progressBarEl) {
      this.progressBarEl.classList.add('pulse');
      setTimeout(() => this.progressBarEl.classList.remove('pulse'), 600);
    }

    // 创建网格卡片视图
    const container = document.getElementById('gachaCardContainer');

    // 隐藏单抽卡片，保留 DOM 元素
    if (this.gachaCardEl) this.gachaCardEl.style.display = 'none';
    if (this.setPetBtnEl) this.setPetBtnEl.style.display = 'none';

    // 移除旧的网格容器
    const oldGrid = container.querySelector('.gacha-grid-container');
    if (oldGrid) oldGrid.remove();
    const oldHint = container.querySelector('.close-hint');
    if (oldHint) oldHint.remove();

    const gridContainer = document.createElement('div');
    gridContainer.className = 'gacha-grid-container';

    pets.forEach((pet, index) => {
      const rarity = this.calculateRarity(pet[1]);
      const isNew = newPets.has(pet[0]);
      const count = this.ownedPets.get(pet[0]) || 0;

      const card = document.createElement('div');
      card.className = `gacha-grid-card rarity-${rarity}`;
      card.innerHTML = `
        ${isNew ? '<div class="gacha-grid-badge new">NEW</div>' : ''}
        <div class="gacha-grid-emoji">${pet[0]}</div>
        <div class="gacha-grid-name">${pet[2]}</div>
        <div class="gacha-grid-rarity">${rarity}★</div>
      `;
      card.addEventListener('click', () => {
        this.showGachaResultDetail(pet);
      });
      gridContainer.appendChild(card);
    });

    container.appendChild(gridContainer);

    // 显示静态提示
    const staticHint = this.gachaOverlayEl.querySelector('.gacha-result-wrapper > .close-hint');
    if (staticHint) staticHint.textContent = '点击卡片查看详情，点击空白处关闭';

    // 显示继续抽卡按钮
    this.showContinueBtn();

    this.gachaOverlayEl.classList.add('active');
  }

  /**
   * 显示继续抽卡按钮
   * 同时显示"再来一次"和"再来十连"两个按钮，方便连续抽卡
   * 
   * 逻辑：
   * 1. 根据当前星尘数量决定是否禁用对应按钮
   * 2. 点击后先关闭弹窗（立即模式），延迟 350ms 开始抽卡
   * 3. 避免在弹窗关闭过程中直接触发抽卡动画导致闪烁
   */
  showContinueBtn() {
    if (!this.continueGachaBtnsEl) return;
    // 单抽按钮
    this.continueSingleBtnEl.textContent = '✨ 再来一次 (10 ✨)';
    this.continueSingleBtnEl.disabled = this.coins < 10;
    this.continueSingleBtnEl.onclick = () => {
      this.closeGachaOverlay(true);
      setTimeout(() => this.doSingleGacha(), 350);
    };
    // 十连按钮
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
   * 关闭弹窗时清理按钮的 onclick 回调，防止内存泄漏
   */
  hideContinueBtn() {
    if (!this.continueGachaBtnsEl) return;
    this.continueGachaBtnsEl.style.display = 'none';
    if (this.continueSingleBtnEl) this.continueSingleBtnEl.onclick = null;
    if (this.continueMultiBtnEl) this.continueMultiBtnEl.onclick = null;
  }

  /**
   * 关闭抽卡弹窗
   * 
   * @param {boolean} isContinue - 是否为继续抽卡模式
   *   - true: 立即关闭（无延迟），用于点击继续按钮后无缝开始下一次抽卡
   *   - false: 延迟 300ms 关闭（与 CSS transition 时长一致），避免重置卡片时闪烁
   * 
   * 流程：
   * 1. 隐藏继续抽卡按钮并清理事件回调
   * 2. 移除 active 类触发 CSS 淡出动画
   * 3. 延迟后重置卡片容器为默认模板（单抽翻转卡片）
   * 4. 刷新 DOM 元素引用
   * 
   * @important closeGachaOverlay 会销毁并重建卡片 DOM，
   *            因此按钮等元素需要放在容器外部，避免被 innerHTML 清空
   */
  closeGachaOverlay(isContinue = false) {
    this.hideContinueBtn();
    // 先移除 active 类触发淡出动画，延迟重置避免闪烁
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
   * 关闭抽卡弹窗后重新获取被重建的元素，并绑定必要的事件
   * 注意：使用 removeEventListener 避免监听器累积
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

    // 移除旧的监听器，避免累积
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
      this.saveGame();
      this.render();
      this.closeGachaOverlay(true);
    }
  }

  // ==========================================
  // 设置与数据管理
  // ==========================================

  /**
   * 打开设置弹窗
   */
  openSettings() {
    this.settingsModalEl.classList.add('active');
    this.importPreviewEl.style.display = 'none';
  }

  /**
   * 关闭设置弹窗
   */
  closeSettings() {
    this.settingsModalEl.classList.remove('active');
    this.importPreviewEl.style.display = 'none';
  }

  /**
   * 导出游戏数据为 JSON 文件
   */
  exportData() {
    const data = {
      version: '1.0',
      timestamp: Date.now(),
      coins: this.coins,
      ownedPets: Array.from(this.ownedPets.entries()),
      activePet: this.activePet
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
   * 处理导入 JSON 备份文件
   * 预览数据并确认后覆盖当前存档
   * @param {Event} e - 文件选择事件
   */
  handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        document.getElementById('previewCoins').textContent = data.coins?.toLocaleString() || '0';
        document.getElementById('previewOwned').textContent = data.ownedPets?.length || '0';
        const activePetData = data.activePet ? this.getPetData(data.activePet) : null;
        document.getElementById('previewActivePet').textContent = activePetData ? `${activePetData[0]} ${activePetData[2]}` : '无';
        this.importPreviewEl.style.display = 'block';

        const confirmImport = confirm('确认导入此备份数据？当前数据将被覆盖！');
        if (confirmImport) {
          this.coins = data.coins || 0;
          this.ownedPets = new Map(data.ownedPets || []);
          this.activePet = data.activePet || null;
          this.saveGame();
          this.render();
          this.closeSettings();
          alert('导入成功！');
        }
      } catch (err) {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 重置文件输入，允许重复选择同一文件
  }

  /**
   * 重置游戏数据
   * 需要二次确认，清除所有进度
   */
  resetGame() {
    const confirm1 = confirm('确定要重置所有数据吗？此操作不可恢复！');
    if (!confirm1) return;
    const confirm2 = confirm('再次确认：所有星尘、收藏、桌宠都将被清除！');
    if (!confirm2) return;

    this.coins = 100;
    this.activePet = EMOJI_DATA[0][0];
    this.ownedPets = new Map();
    this.ownedPets.set(EMOJI_DATA[0][0], 1);
    this.saveGame();
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
            this.saveGame();
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
    this.renderCollection();
  }

  /**
   * 渲染当前桌宠信息面板
   * 包括 Emoji 展示、名称、稀有度、持有数量、登场收益、全局总被动收益
   */
  renderActivePet() {
    if (this.activePet) {
      const petData = this.getPetData(this.activePet);
      if (petData) {
        const rarity = this.calculateRarity(petData[1]);
        const count = this.ownedPets.get(this.activePet) || 1;
        const income = (rarity * count / 10).toFixed(1);

        this.petEmojiEl.textContent = this.activePet;
        this.headerPetEmojiEl.textContent = this.activePet;
        this.headerPetNameEl.textContent = petData[2];
        this.activePetRarityEl.textContent = `${rarity}★`;
        this.activePetRarityEl.className = 'pet-info-value';
        this.activePetRarityEl.classList.add(`rarity-${rarity}`);
        this.activePetOwnedEl.textContent = `x${count}`;
        this.activePetRateEl.textContent = `${income} / 秒`;
      }
    }
  }

  /**
   * 渲染筛选标签
   * 包括系列分类标签和稀有度分类标签
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

    // === "全部"按钮 ===
    if (this.filterAllBtnEl) {
      const allBtnClick = () => {
        this.currentSeriesFilter = 'all';
        this.currentRarityFilter = 'all';
        this.renderFilters();
        this.renderCollection();
      };
      this.filterAllBtnEl.replaceWith(this.filterAllBtnEl.cloneNode(true));
      this.filterAllBtnEl = document.getElementById('filterAllBtn');
      this.filterAllBtnEl.addEventListener('click', allBtnClick);
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
      { value: '1', label: '1★' },
      { value: '2', label: '2★' },
      { value: '3', label: '3★' },
      { value: '4', label: '4★' },
      { value: '5', label: '5★' },
      { value: '6', label: '6★' },
      { value: '7', label: '7★' },
      { value: '8', label: '8★' }
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
   * 渲染图鉴网格
   * 根据当前筛选条件过滤并显示已拥有的 Emoji 卡片
   */
  renderCollection() {
    // 构建宠物数据列表
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

    // 系列筛选
    if (this.currentSeriesFilter !== 'all') {
      pets = pets.filter(p => p.series === this.currentSeriesFilter);
    }

    // 稀有度筛选
    if (this.currentRarityFilter !== 'all') {
      pets = pets.filter(p => p.rarity === parseInt(this.currentRarityFilter));
    }

    // 更新收集进度（根据筛选条件显示对应进度）
    const allOwnedKeys = [...this.ownedPets.keys()];
    if (this.currentSeriesFilter === 'all' && this.currentRarityFilter === 'all') {
      // 显示总进度
      this.collectionProgressEl.textContent = `${allOwnedKeys.length} / ${EMOJI_DATA.length}`;
      if (this.progressBarEl) {
        this.progressBarEl.style.width = `${(allOwnedKeys.length / EMOJI_DATA.length * 100).toFixed(2)}%`;
      }
    } else {
      // 计算筛选范围内的总数量和已收集数量
      const filteredPets = EMOJI_DATA.filter(pet => {
        if (this.currentSeriesFilter !== 'all' && pet[3] !== this.currentSeriesFilter) return false;
        if (this.currentRarityFilter !== 'all') {
          const petRarity = this.calculateRarity(pet[1]);
          if (petRarity !== parseInt(this.currentRarityFilter)) return false;
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

    // 渲染宠物卡片（仅显示已拥有或当前桌宠）
    this.collectionGridEl.innerHTML = pets.filter(pet => pet.owned > 0 || pet.emoji === this.activePet).map(pet => {
      const isActive = pet.emoji === this.activePet;
      const tooltip = pet.owned > 0 ? `U+${pet.code} · ${pet.series} · x${pet.owned}` : `U+${pet.code} · ${pet.series} · 未收集`;
      return `
        <div class="pet-card rarity-${pet.rarity} ${isActive ? 'active' : ''}" data-emoji="${pet.emoji}" data-tooltip="${tooltip}">
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

    // 绑定卡片点击事件（切换桌宠）
    this.collectionGridEl.querySelectorAll('.pet-card').forEach(card => {
      card.addEventListener('click', () => {
        const emoji = card.dataset.emoji;
        this.activePet = emoji;
        this.saveGame();
        this.render();
      });
    });
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
}

// ==========================================
// 游戏入口
// ==========================================

/**
 * 创建游戏实例
 * 页面加载后立即启动游戏
 */
const game = new EmojiGacha();
