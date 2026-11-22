import * as THREE from 'three';
import { buildJiaoxiWorld } from './mapBuilder.js';
import { PlayerController } from './player.js';
import { passport } from './passport.js';
import { TASKS_DATA, SCENES_DATA, TREASURE_CHEST } from './culturalData.js';
import { audio } from './audio.js';
import { initVeggieMinigame, initPoeMinigame } from './minigames.js';
import { createSkyGradientTexture } from './textures.js';

// 初始化 Three.js 場景與渲染器
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = createSkyGradientTexture(); // 逼真自然大氣天穹垂直漸層
scene.fog = new THREE.FogExp2(0xcce2f8, 0.0052); // 自然溫潤遠山大氣霧霾

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 建構礁溪 3D 場景
const { interactiveObjects, animatedUpdaters, colliders } = buildJiaoxiWorld(scene);

// 初始化玩家控制器（傳入實體碰撞體，杜絕穿模）
const player = new PlayerController(scene, camera, renderer.domElement, colliders);

// 當前可互動的物件
let currentNearbyObject = null;
let activeModal = null; // 'task' | 'passport' | 'chest'

// DOM 元素引用
const interactPrompt = document.getElementById('interact-prompt');
const interactTargetName = document.getElementById('interact-target-name');
const hudProgressText = document.getElementById('hud-progress-text');
const hudProgressBar = document.getElementById('hud-progress-bar');
const hudHintText = document.getElementById('hud-hint-text');

// 彈窗模態框引用
const taskModal = document.getElementById('task-modal');
const passportModal = document.getElementById('passport-modal');
const chestModal = document.getElementById('chest-modal');
const easterEggModal = document.getElementById('easter-egg-modal');
const creditsModal = document.getElementById('credits-modal');

// 全域調試掛載
window.player = player;
window.__DEBUG_GAME__ = { player, scene, passport };

// 介面按鈕
const btnOpenPassport = document.getElementById('btn-open-passport');
const btnOpenCredits = document.getElementById('btn-open-credits');
const btnPassportViewCredits = document.getElementById('btn-passport-view-credits');
const btnResetGame = document.getElementById('btn-reset-game');
const btnToggleBgm = document.getElementById('btn-toggle-bgm');
const btnToggleSfx = document.getElementById('btn-toggle-sfx');

// 初始化 UI
function updateHUD(state) {
  hudProgressText.textContent = `印章進度：${state.progressText}`;
  hudProgressBar.style.width = `${state.percent}%`;
  hudHintText.textContent = state.nextHint;
  renderPassportStamps(state);
}

// 渲染護照印章卡片
function renderPassportStamps(state) {
  const container = document.getElementById('passport-stamps-grid');
  container.innerHTML = '';

  state.stamps.forEach((stamp, idx) => {
    const card = document.createElement('div');
    card.className = `stamp-slot ${stamp.isCollected ? 'collected' : 'locked'}`;

    if (stamp.isCollected) {
      card.innerHTML = `
        <div class="stamp-img-box">
          <img src="${stamp.stampSvg}" alt="${stamp.stampName}" class="stamp-svg-img" />
        </div>
        <div class="stamp-slot-title">${stamp.stampName}</div>
        <div class="stamp-slot-loc">${stamp.locationName}</div>
        <div class="stamp-status-tag tag-done">已取得 ★</div>
      `;
    } else {
      card.innerHTML = `
        <div class="stamp-img-box empty-box">
          <span class="empty-number">${idx + 1}</span>
        </div>
        <div class="stamp-slot-title">${stamp.title}</div>
        <div class="stamp-slot-loc">${stamp.locationName}</div>
        <div class="stamp-status-tag tag-wait">待探索</div>
      `;
    }
    container.appendChild(card);
  });

  const chestStatusDesc = document.getElementById('passport-chest-status');
  if (state.hasOpenedChest) {
    chestStatusDesc.textContent = '🎉 已成功開啟寶箱！取得「礁溪文化旅人」數位徽章！';
    chestStatusDesc.className = 'status-msg text-success';
  } else if (state.canOpenChest) {
    chestStatusDesc.textContent = '★ 五枚印章已集齊！快前往中央任務板開啟文化寶箱！';
    chestStatusDesc.className = 'status-msg text-gold';
  } else {
    chestStatusDesc.textContent = `還差 ${5 - state.current} 枚印章即可開啟文化寶箱。`;
    chestStatusDesc.className = 'status-msg';
  }
}

// 監聽護照狀態改變
passport.onChange((state) => {
  updateHUD(state);
});
updateHUD(passport.getState());

// 鄰近檢測與互動提示
function checkProximity() {
  if (activeModal) {
    interactPrompt.classList.add('hidden');
    return;
  }

  let found = null;
  const pPos = player.position;

  for (const obj of interactiveObjects) {
    const distSq = (pPos.x - obj.x) ** 2 + (pPos.z - obj.z) ** 2;
    if (distSq <= obj.radius ** 2) {
      found = obj;
      break;
    }
  }

  currentNearbyObject = found;

  if (found) {
    interactPrompt.classList.remove('hidden');
    interactTargetName.textContent = found.label;
  } else {
    interactPrompt.classList.add('hidden');
  }
}

// 執行互動
function triggerCurrentInteraction() {
  if (!currentNearbyObject) return;
  audio.playInteract();

  if (currentNearbyObject.type === 'task') {
    const task = TASKS_DATA.find(t => t.id === currentNearbyObject.taskId);
    if (task) {
      openTaskModal(task);
    }
  } else if (currentNearbyObject.type === 'chest') {
    openChestModal();
  } else if (currentNearbyObject.type === 'easter_egg') {
    if (window.__triggerEasterEggReveal) {
      window.__triggerEasterEggReveal(openEasterEggModal);
    } else {
      openEasterEggModal();
    }
  }
}

// 開啟隱藏彩蛋彈窗
function openEasterEggModal() {
  activeModal = 'easter_egg';
  if (easterEggModal) {
    easterEggModal.classList.remove('hidden');
    const modalBox = easterEggModal.querySelector('.modal-box');
    if (modalBox) modalBox.scrollTop = 0;
  }
  audio.playSuccess();
}

// 開啟線索任務彈窗
function openTaskModal(task) {
  activeModal = 'task';
  taskModal.classList.remove('hidden');
  const modalBox = taskModal.querySelector('.modal-box');
  if (modalBox) modalBox.scrollTop = 0; // 重設滾動條至頂部

  const isCompleted = passport.isTaskCompleted(task.id);
  const taskHeader = document.getElementById('task-modal-header');
  taskHeader.textContent = task.title;

  const taskLocation = document.getElementById('task-modal-location');
  taskLocation.textContent = `景點：${task.locationName} ｜ 線索：${task.clueObject}`;

  const taskPhoto = document.getElementById('task-modal-photo');
  taskPhoto.src = task.realPhoto;

  const taskPhotoCaption = document.getElementById('task-modal-photo-caption');
  if (taskPhotoCaption) {
    taskPhotoCaption.textContent = task.photoCredit ? `📷 照片授權：${task.photoCredit}` : '📷 實景照片考證';
  }

  const taskSource = document.getElementById('task-modal-source');
  if (taskSource) {
    taskSource.textContent = task.culturalSource ? `🏛️ 文史考證來源：${task.culturalSource}` : '🏛️ 文史考證來源：宜蘭縣政府文化局 / 礁溪鄉公所';
  }

  const promptText = document.getElementById('task-modal-prompt');
  promptText.textContent = task.prompt;

  const optionsContainer = document.getElementById('task-options-container');
  const minigameContainer = document.getElementById('task-minigame-container');
  const feedbackBox = document.getElementById('task-feedback-box');
  const explainBox = document.getElementById('task-explain-box');

  optionsContainer.innerHTML = '';
  feedbackBox.className = 'feedback-box hidden';
  feedbackBox.innerHTML = '';
  explainBox.className = 'explain-box hidden';

  if (isCompleted) {
    explainBox.classList.remove('hidden');
    explainBox.innerHTML = `
      <div class="explain-title">★ 本關任務已完成（已獲取印章）</div>
      <p class="explain-text">${task.explanation}</p>
      <div class="stamp-awarded-display">
        <img src="images/${task.stampId}.svg" alt="${task.stampName}" />
        <span>【${task.stampName}】</span>
      </div>
    `;
  }

  // 判斷是否為情境小遊戲任務（任務二：溫泉蔬果採集 / 任務四：協天廟擲筊乞龜）
  if (task.id === 'task_crops') {
    optionsContainer.classList.add('hidden');
    minigameContainer.classList.remove('hidden');
    minigameContainer.innerHTML = '';
    initVeggieMinigame({
      container: minigameContainer,
      task,
      passport,
      audio,
      onComplete: (completedTask) => {
        showMinigameCompletion(completedTask);
      }
    });
  } else if (task.id === 'task_turtle') {
    optionsContainer.classList.add('hidden');
    minigameContainer.classList.remove('hidden');
    minigameContainer.innerHTML = '';
    initPoeMinigame({
      container: minigameContainer,
      task,
      passport,
      audio,
      onComplete: (completedTask) => {
        showMinigameCompletion(completedTask);
      }
    });
  } else {
    // 一般文化知識選擇題（任務一、任務三、任務五）
    minigameContainer.classList.add('hidden');
    optionsContainer.classList.remove('hidden');

    task.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      if (isCompleted) {
        btn.disabled = true;
        if (opt.isCorrect) btn.classList.add('correct-answer');
      } else {
        btn.addEventListener('click', () => {
          handleOptionAnswer(task, opt, btn);
        });
      }
      optionsContainer.appendChild(btn);
    });
  }
}

function showMinigameCompletion(task) {
  const feedbackBox = document.getElementById('task-feedback-box');
  const explainBox = document.getElementById('task-explain-box');

  feedbackBox.className = 'feedback-box feedback-success pop-in';
  feedbackBox.innerHTML = `<strong>✔ 太棒了，互動挑戰圓滿成功！</strong> 成功取得一枚【${task.stampName}】！`;

  explainBox.classList.remove('hidden');
  explainBox.innerHTML = `
    <div class="explain-title">【文化深度解說】</div>
    <p class="explain-text">${task.explanation}</p>
    <div class="stamp-awarded-display pop-in">
      <img src="images/${task.stampId}.svg" alt="${task.stampName}" />
      <span>已蓋印：${task.stampName}</span>
    </div>
  `;
}

function handleOptionAnswer(task, option, btnElement) {
  const feedbackBox = document.getElementById('task-feedback-box');
  const explainBox = document.getElementById('task-explain-box');

  if (option.isCorrect) {
    audio.playCorrect();
    feedbackBox.className = 'feedback-box feedback-success';
    feedbackBox.innerHTML = `<strong>✔ 太棒了，回答正確！</strong> 成功取得一枚【${task.stampName}】！`;

    passport.completeTask(task.id);

    explainBox.classList.remove('hidden');
    explainBox.innerHTML = `
      <div class="explain-title">【文化深度解說】</div>
      <p class="explain-text">${task.explanation}</p>
      <div class="stamp-awarded-display pop-in">
        <img src="images/${task.stampId}.svg" alt="${task.stampName}" />
        <span>已蓋印：${task.stampName}</span>
      </div>
    `;

    // 禁用選項
    document.querySelectorAll('.option-btn').forEach(b => {
      b.disabled = true;
      if (b === btnElement) b.classList.add('correct-answer');
    });
  } else {
    audio.playIncorrect();
    feedbackBox.className = 'feedback-box feedback-error shake';
    feedbackBox.innerHTML = `<strong>✖ 答案不太對喔！</strong><br>提示：${option.hint || '請再次仔細觀察線索！可重新嘗試。'}`;
    btnElement.classList.add('wrong-answer');
    setTimeout(() => {
      btnElement.classList.remove('wrong-answer');
    }, 1500);
  }
}

// 開啟寶箱彈窗
function openChestModal() {
  activeModal = 'chest';
  chestModal.classList.remove('hidden');
  const modalBox = chestModal.querySelector('.modal-box');
  if (modalBox) modalBox.scrollTop = 0;

  const state = passport.getState();
  const chestContent = document.getElementById('chest-modal-content');

  if (state.hasOpenedChest) {
    chestContent.innerHTML = `
      <div class="chest-win-box">
        <img src="${TREASURE_CHEST.badgeImage}" alt="數位徽章" class="badge-big-img glow-pulse" />
        <h2 class="gold-title">已獲得「礁溪文化旅人」榮譽徽章！</h2>
        <p class="congrats-p">感謝您深入走訪湯圍溝溫泉、協天廟與五峰旗風景區，傳承在地文化精神。</p>
        <button id="btn-replay-from-chest" class="primary-btn mt-3">重新遊玩探索</button>
      </div>
    `;
    document.getElementById('btn-replay-from-chest')?.addEventListener('click', () => {
      resetGame();
      closeAllModals();
    });
  } else if (state.canOpenChest) {
    passport.openChest();
    chestContent.innerHTML = `
      <div class="chest-win-box pop-in">
        <div class="sparkles">✨ ✨ ✨</div>
        <img src="${TREASURE_CHEST.badgeImage}" alt="數位徽章" class="badge-big-img bounce-in glow-pulse" />
        <h2 class="gold-title">恭喜開啟文化寶箱！</h2>
        <h3 class="sub-badge-title">獲得榮譽獎勵：【礁溪文化旅人】數位徽章</h3>
        <p class="congrats-p">您已成功踏訪三個礁溪代表性景點，完成全部五項深度文化任務，並蒐集到所有文化印章！</p>
        <div class="badge-meta">
          <span>認證主題：宜蘭礁溪文化尋寶</span> ｜ <span>進度：5 / 5 完全通關</span>
        </div>
        <button id="btn-replay-from-chest" class="primary-btn mt-3">重新遊玩（回到 0/5）</button>
      </div>
    `;
    document.getElementById('btn-replay-from-chest')?.addEventListener('click', () => {
      resetGame();
      closeAllModals();
    });
  } else {
    chestContent.innerHTML = `
      <div class="chest-locked-box">
        <div class="lock-icon">🔒</div>
        <h2>文化寶箱尚未開啟</h2>
        <p class="mt-2">寶箱需要集滿全部 <strong>5 枚文化印章</strong> 才能開啟。</p>
        <p class="current-collect-hint">您目前已收集：<strong>${state.current} / 5</strong> 枚印章</p>
        <p class="next-guide">${state.nextHint}</p>
        <button class="secondary-btn mt-3 close-modal-btn">繼續尋寶</button>
      </div>
    `;
    chestContent.querySelector('.close-modal-btn')?.addEventListener('click', closeAllModals);
  }
}

// 開啟與收合護照
function togglePassport() {
  if (activeModal === 'passport') {
    closeAllModals();
  } else {
    closeAllModals();
    activeModal = 'passport';
    passportModal.classList.remove('hidden');
    const modalBox = passportModal.querySelector('.modal-box');
    if (modalBox) modalBox.scrollTop = 0;
    audio.playInteract();
  }
}

function closeAllModals() {
  activeModal = null;
  taskModal.classList.add('hidden');
  passportModal.classList.add('hidden');
  chestModal.classList.add('hidden');
  if (easterEggModal) easterEggModal.classList.add('hidden');
  if (creditsModal) creditsModal.classList.add('hidden');
  player.clearKeys(); // 防止彈窗關閉後按鍵黏滯卡住
}

// 開啟素材與資料來源彈窗
function openCreditsModal() {
  closeAllModals();
  activeModal = 'credits';
  if (creditsModal) {
    creditsModal.classList.remove('hidden');
    const modalBox = creditsModal.querySelector('.modal-box');
    if (modalBox) modalBox.scrollTop = 0;
  }
  audio.playInteract();
}

// 重新遊玩：進度回到 0/5，角色重置至起點
function resetGame() {
  if (confirm('確定要重新遊玩嗎？護照進度將重置為 0 / 5，角色將返回起點。')) {
    passport.reset();
    player.resetToSpawn();
    closeAllModals();
    audio.playInteract();
  }
}

// 綁定鍵盤快捷鍵
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    if (!activeModal && currentNearbyObject) {
      triggerCurrentInteraction();
    }
  } else if (e.code === 'KeyP') {
    togglePassport();
  } else if (e.code === 'Escape') {
    closeAllModals();
  }
});

// 介面按鈕與畫布互動事件
interactPrompt.addEventListener('click', triggerCurrentInteraction);
container.addEventListener('click', (e) => {
  // 如果點擊時已經處於互動範圍內且無彈窗，且並非滑鼠拖曳視角後放開，才觸發互動（修復視角旋轉誤觸 Bug）
  if (!activeModal && currentNearbyObject && !player.isDragging && !player.wasActuallyDragging) {
    triggerCurrentInteraction();
  }
});
btnOpenPassport.addEventListener('click', togglePassport);
btnResetGame.addEventListener('click', resetGame);
btnOpenCredits?.addEventListener('click', openCreditsModal);
btnPassportViewCredits?.addEventListener('click', openCreditsModal);

btnToggleBgm.addEventListener('click', () => {
  const isPlaying = audio.toggleBgm();
  btnToggleBgm.textContent = isPlaying ? '🎵 音樂：開' : '🎵 音樂：關';
  btnToggleBgm.classList.toggle('active', isPlaying);
});

btnToggleSfx.addEventListener('click', () => {
  const isMuted = audio.toggleMute();
  btnToggleSfx.textContent = isMuted ? '🔇 音效：靜音' : '🔊 音效：開';
  btnToggleSfx.classList.toggle('muted', isMuted);
});

// 模態框關閉按鈕通用綁定
document.querySelectorAll('.close-modal-btn').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

// 點擊彈窗外部半透明遮罩背景時關閉彈窗（提升操作體驗）
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeAllModals();
    }
  });
});

// 視窗自適應縮放
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 主遊戲迴圈
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // 更新玩家位移、指針與相機（若彈窗開啟則鎖定移動）
  player.update(delta, elapsedTime, activeModal !== null);

  // 更新 3D 空間立體音景（隨玩家與溫泉、瀑布之距離動態調音）
  audio.updateSpatialAudio(player.position);

  // 更新場景動態（煙霧、水霧、互動發光旋轉）
  animatedUpdaters.forEach(fn => fn(delta, elapsedTime));

  // 檢查碰撞與鄰近互動
  checkProximity();

  // 渲染
  renderer.render(scene, camera);
}

animate();
