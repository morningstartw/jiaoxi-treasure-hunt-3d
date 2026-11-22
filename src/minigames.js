// 礁溪尋寶文化小遊戲模組
// 任務二：【湯圍溝・溫泉蔬果採集分類】
// 任務四：【協天廟・沉浸式擲筊乞龜大典】

export function initVeggieMinigame({ container, task, passport, audio, onComplete }) {
  const isCompleted = passport.isTaskCompleted(task.id);

  const VEGGIES = [
    {
      id: 'water_spinach',
      name: '溫泉空心菜（水蕹菜）',
      icon: '🥬',
      tag: '礁溪第一寶',
      desc: '溫泉水滋養使菜莖特粗中空、質地脆嫩，炒後不變黑！',
      isCorrect: true
    },
    {
      id: 'tomato',
      name: '溫泉番茄',
      icon: '🍅',
      tag: '溫泉甜美果物',
      desc: '利用溫泉水恆溫調節地溫，皮薄多汁，酸甜濃郁！',
      isCorrect: true
    },
    {
      id: 'bamboo_shoot',
      name: '溫泉茭白筍（美人腿）',
      icon: '🎋',
      tag: '水耕甘甜珍品',
      desc: '溫泉田栽培出的白嫩筍肉，無纖維粗渣、甘甜如蜜！',
      isCorrect: true
    },
    {
      id: 'peach',
      name: '雪地水蜜桃',
      icon: '🍑',
      tag: '高山低溫產物',
      desc: '生長於高海拔低溫寒冷氣候，非平地溫泉農產。',
      isCorrect: false,
      hint: '水蜜桃需要高山寒冷氣候喔！礁溪溫泉水溫約 58°C 太溫暖啦！'
    },
    {
      id: 'durian',
      name: '金枕頭榴槤',
      icon: '🍈',
      tag: '熱帶雨林果王',
      desc: '赤道熱帶常年高溫果樹，非宜蘭在地特色農特產。',
      isCorrect: false,
      hint: '榴槤是東南亞熱帶雨林水果，不是礁溪當地的溫泉農作物喔！'
    }
  ];

  let collectedSet = new Set(isCompleted ? ['water_spinach', 'tomato', 'bamboo_shoot'] : []);

  function render() {
    container.innerHTML = `
      <div class="veggie-game-wrap">
        <div class="game-instruction-banner">
          <span class="basket-target-badge">🧺 任務目標</span>
          請點擊下方蔬果，挑選出 <strong>3 樣真正的「礁溪溫泉農特產」</strong> 放入溫泉竹籃中！
        </div>

        <!-- 溫泉竹籃與收集槽 -->
        <div class="hot-spring-basket-area ${collectedSet.size === 3 ? 'basket-complete glow-pulse' : ''}">
          <div class="basket-steam">
            <span>♨️</span><span>♨️</span><span>♨️</span>
          </div>
          <div class="basket-header">
            <span class="basket-title">♨️ 礁溪溫泉浸潤竹籃</span>
            <span class="basket-counter">已採集：<strong id="veggie-count">${collectedSet.size}</strong> / 3</span>
          </div>

          <div class="basket-slots">
            ${[
              { id: 'water_spinach', label: '溫泉空心菜', defaultIcon: '🥬' },
              { id: 'tomato', label: '溫泉番茄', defaultIcon: '🍅' },
              { id: 'bamboo_shoot', label: '溫泉茭白筍', defaultIcon: '🎋' }
            ].map(slot => {
              const has = collectedSet.has(slot.id);
              return `
                <div class="basket-slot ${has ? 'filled pop-in' : 'empty'}" data-slot-id="${slot.id}">
                  ${has ? `
                    <div class="slot-icon">${slot.defaultIcon}</div>
                    <div class="slot-name">${slot.label}</div>
                    <div class="slot-check">✔ 入籃</div>
                  ` : `
                    <div class="slot-placeholder">？</div>
                    <div class="slot-name">${slot.label}</div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 提示反饋條 -->
        <div id="veggie-feedback-toast" class="game-toast hidden"></div>

        <!-- 蔬果待選區 -->
        <div class="veggie-cards-grid">
          ${VEGGIES.map(item => {
            const isPicked = collectedSet.has(item.id);
            return `
              <button class="veggie-card-btn ${isPicked ? 'already-picked' : ''}" data-veggie-id="${item.id}" ${isPicked ? 'disabled' : ''}>
                <div class="veggie-card-icon">${item.icon}</div>
                <div class="veggie-card-info">
                  <div class="veggie-card-title">${item.name}</div>
                  <div class="veggie-card-tag">${item.tag}</div>
                  <div class="veggie-card-desc">${item.desc}</div>
                </div>
                <div class="veggie-card-action">
                  ${isPicked ? '<span class="picked-tag">已採集 ✔</span>' : '<span class="pick-tag">放入竹籃 ＋</span>'}
                </div>
              </button>
            `;
          }).join('')}
        </div>

        ${isCompleted ? `
          <div class="minigame-replay-row">
            <button id="btn-replay-veggie" class="secondary-btn small-btn">🔄 清空竹籃・重新採集挑戰</button>
          </div>
        ` : ''}
      </div>
    `;

    // 綁定點擊事件
    container.querySelectorAll('.veggie-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-veggie-id');
        const item = VEGGIES.find(v => v.id === id);
        if (!item) return;

        const toast = container.querySelector('#veggie-feedback-toast');

        if (item.isCorrect) {
          // 正確放入竹籃
          audio.playVeggiePop();
          collectedSet.add(item.id);

          toast.className = 'game-toast toast-success pop-in';
          toast.innerHTML = `<strong>✔ 採集成功！</strong>【${item.name}】已放入溫泉竹籃！`;
          toast.classList.remove('hidden');

          render();

          if (collectedSet.size === 3) {
            audio.playCorrect();
            passport.completeTask(task.id);
            if (onComplete) onComplete(task);
          }
        } else {
          // 錯誤農特產
          audio.playVeggieFail();
          btn.classList.add('shake-error');
          setTimeout(() => btn.classList.remove('shake-error'), 600);

          toast.className = 'game-toast toast-hint pop-in';
          toast.innerHTML = `<strong>💡 溫泉農夫提醒：</strong> ${item.hint}`;
          toast.classList.remove('hidden');
        }
      });
    });

    const replayBtn = container.querySelector('#btn-replay-veggie');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        collectedSet.clear();
        render();
      });
    }
  }

  render();
}

// ==============================================================
// 任務四：【協天廟・沉浸式擲筊乞龜大典】
// ==============================================================
export function initPoeMinigame({ container, task, passport, audio, onComplete }) {
  const isCompleted = passport.isTaskCompleted(task.id);
  let tossCount = 0;
  let isTossing = false;

  // 筊杯狀態：'idle' | 'sheng' (聖筊: 1平1凸) | 'xiao' (笑筊: 雙平) | 'yin' (陰筊: 雙凸)
  let currentResult = isCompleted ? 'sheng' : 'idle';

  function render() {
    container.innerHTML = `
      <div class="poe-game-wrap">
        <div class="altar-banner">
          <div class="altar-tag">🏮 協天廟大殿供案</div>
          <div class="altar-sub">春祭乞龜大典・虔誠向關聖帝君擲筊祈求平安壽龜</div>
        </div>

        <!-- 3D 筊杯供案舞台 -->
        <div class="poe-stage-box ${currentResult === 'sheng' ? 'stage-divine-glow' : ''}">
          <div class="incense-burn-decor">
            <span class="incense-icon">🕯️</span>
            <span class="altar-scroll-text">關聖帝君 庇佑四方</span>
            <span class="incense-icon">🕯️</span>
          </div>

          <!-- 兩枚立體紅木筊杯 -->
          <div id="poe-pair" class="poe-pair-container ${isTossing ? 'poe-anim-tossing' : ''} poe-state-${currentResult}">
            <!-- 筊杯 A -->
            <div class="poe-block poe-block-a">
              <div class="poe-crescent poe-face-${getBlockFace(currentResult, 'a')}">
                <div class="poe-curved-side"></div>
                <div class="poe-flat-side">
                  <span class="poe-grain-mark">❖</span>
                </div>
              </div>
            </div>

            <!-- 筊杯 B -->
            <div class="poe-block poe-block-b">
              <div class="poe-crescent poe-face-${getBlockFace(currentResult, 'b')}">
                <div class="poe-curved-side"></div>
                <div class="poe-flat-side">
                  <span class="poe-grain-mark">❖</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 擲筊結果顯示銘牌 -->
          <div id="poe-result-banner" class="poe-result-banner ${currentResult !== 'idle' ? 'pop-in' : 'hidden'}">
            ${getResultBannerHtml(currentResult)}
          </div>
        </div>

        <!-- 操作按鈕與引導 -->
        <div class="poe-actions-area">
          ${currentResult === 'sheng' ? `
            <div class="turtle-awarded-card pop-in">
              <div class="turtle-badge-icon">🐢</div>
              <div class="turtle-badge-text">
                <div class="turtle-badge-title">🎉 關聖帝君降恩・賜予【平安壽龜】！</div>
                <div class="turtle-badge-pledge"><strong>傳統盟約：</strong>來年元月請「加倍還願（倍還）」答謝神恩，福澤子孫！</div>
              </div>
            </div>
            <div class="minigame-replay-row mt-2">
              <button id="btn-toss-again" class="secondary-btn small-btn">🙏 再次擲筊祈福體驗</button>
            </div>
          ` : `
            <button id="btn-toss-poe" class="primary-btn toss-action-btn ${isTossing ? 'disabled' : ''}" ${isTossing ? 'disabled' : ''}>
              ${isTossing ? '🌪️ 筊杯翻轉神恩顯應中...' : (tossCount === 0 ? '🙏 雙手合十・虔誠擲筊祈求壽龜' : '🙏 誠心祈請・再次擲筊')}
            </button>
            <div class="toss-tip-text">
              提示：擲得「聖筊（一平一凸）」即可獲賜平安壽龜！
            </div>
          `}
        </div>
      </div>
    `;

    const tossBtn = container.querySelector('#btn-toss-poe');
    if (tossBtn) {
      tossBtn.addEventListener('click', performToss);
    }

    const replayBtn = container.querySelector('#btn-toss-again');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        currentResult = 'idle';
        render();
      });
    }
  }

  function getBlockFace(result, block) {
    if (result === 'idle') return block === 'a' ? 'flat' : 'curved';
    if (result === 'sheng') return block === 'a' ? 'flat' : 'curved'; // 1平1凸
    if (result === 'xiao') return 'flat'; // 雙平朝上
    if (result === 'yin') return 'curved'; // 雙凸朝上
    return 'curved';
  }

  function getResultBannerHtml(result) {
    if (result === 'sheng') {
      return `
        <div class="poe-tag tag-sheng">🌟 大吉・聖筊（一陰一陽 / 一平一凸）</div>
        <div class="poe-desc">帝君大開方便之門，允諾所求，賜予信徒平安健康、闔家吉祥！</div>
      `;
    }
    if (result === 'xiao') {
      return `
        <div class="poe-tag tag-xiao">😊 笑筊（兩陽・雙平朝上）</div>
        <div class="poe-desc">關聖帝君微笑沉思中，信徒心意真誠，請理清祈願或換個角度祈求，再擲一次！</div>
      `;
    }
    if (result === 'yin') {
      return `
        <div class="poe-tag tag-yin">🧐 陰筊（兩陰・雙凸朝上）</div>
        <div class="poe-desc">帝君提點需平心靜氣、誠心正意。調勻氣息後請再次虔誠擲筊！</div>
      `;
    }
    return '';
  }

  function performToss() {
    if (isTossing) return;
    isTossing = true;
    tossCount++;

    // 播放擲筊起始動態
    render();

    // 在拋到最高點及落地時播放清脆敲擊聲
    setTimeout(() => {
      audio.playWoodClack();
    }, 620);

    setTimeout(() => {
      isTossing = false;

      // 決定結果：若已擲過 1 次以上且未中，保底出聖筊；否則聖筊 60%、笑筊 20%、陰筊 20%
      let outcome = 'sheng';
      if (tossCount === 1) {
        const rand = Math.random();
        if (rand < 0.6) outcome = 'sheng';
        else if (rand < 0.8) outcome = 'xiao';
        else outcome = 'yin';
      } else {
        outcome = 'sheng';
      }

      currentResult = outcome;

      if (outcome === 'sheng') {
        audio.playCorrect();
        passport.completeTask(task.id);
        if (onComplete) onComplete(task);
      } else {
        audio.playVeggieFail();
      }

      render();
    }, 950);
  }

  render();
}
