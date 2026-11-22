import * as THREE from 'three';
import { SCENES_DATA, TASKS_DATA } from './culturalData.js';
import { passport } from './passport.js';
import {
  createGrassTexture,
  createAsphaltTexture,
  createCrosswalkTexture,
  createCobblestoneTexture,
  createWoodDeckTexture,
  createWaterfallTexture
} from './textures.js';

export function buildJiaoxiWorld(scene) {
  const interactiveObjects = [];
  const animatedUpdaters = [];
  const colliders = [];

  // 1. 環境光與太陽光（明亮微風午後，通透逼真）
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x667788, 1.0);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfffbe8, 1.45);
  dirLight.position.set(45, 75, 35);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 280;
  dirLight.shadow.camera.left = -100;
  dirLight.shadow.camera.right = 100;
  dirLight.shadow.camera.top = 100;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.bias = -0.0003;
  scene.add(dirLight);

  // 2. 主地貌草地（套用真實細緻無縫草皮纖維與泥土顆粒貼圖）
  const grassTex = createGrassTexture();
  const groundGeo = new THREE.PlaneGeometry(240, 240);
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.85,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 3. 晴空漂浮 Low-Poly 白雲群
  createSkyClouds(scene, animatedUpdaters);

  // 3.1 宜蘭雪山山脈環抱群峰 ＆ 太平洋龜山島地貌
  createDistantMountainBackdrop(scene);

  // 3.2 暖陽與大氣日芒天象
  createSunAndAtmosphere(scene);

  // 4. 街道與石板路系統 + 斑馬線 + 景觀石燈籠
  createRoadsAndLanterns(scene);

  // 5. 礁溪在地溫泉商圈街景與建築（溫泉飯店、特產伴手禮店、小吃舖、長椅、販賣機）
  buildJiaoxiTownBuildings(scene, colliders);

  // 註冊地圖實體碰撞體（杜絕角色穿模）
  registerWorldColliders(colliders);

  // 景觀標誌看板輔助生成器（雙面、厚度、不穿模）
  function createSignpost(title, x, y, z, rotY = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 8), poleMat);
    pole1.position.set(-1.4, 1.6, -0.08);
    pole1.castShadow = true;
    const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 8), poleMat);
    pole2.position.set(1.4, 1.6, -0.08);
    pole2.castShadow = true;
    group.add(pole1, pole2);

    const frameGeo = new THREE.BoxGeometry(3.6, 1.25, 0.14);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 3.1, 0);
    frame.castShadow = true;
    group.add(frame);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e272e';
    ctx.roundRect(10, 10, 492, 140, 20);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 80);

    const texture = new THREE.CanvasTexture(canvas);
    const boardMat = new THREE.MeshBasicMaterial({ map: texture });
    const boardFront = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), boardMat);
    boardFront.position.set(0, 3.1, 0.08);
    group.add(boardFront);

    const backCanvas = document.createElement('canvas');
    backCanvas.width = 128;
    backCanvas.height = 64;
    const bctx = backCanvas.getContext('2d');
    bctx.fillStyle = '#4e342e';
    bctx.fillRect(0, 0, 128, 64);
    const backTex = new THREE.CanvasTexture(backCanvas);
    const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), new THREE.MeshBasicMaterial({ map: backTex }));
    boardBack.rotation.y = Math.PI;
    boardBack.position.set(0, 3.1, -0.08);
    group.add(boardBack);

    scene.add(group);
    return group;
  }

  // 浮動光柱與互動圓圈輔助生成器
  function createInteractiveRing(x, z, label, type, taskId = null) {
    const ringGroup = new THREE.Group();
    ringGroup.position.set(x, 0.05, z);

    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: type === 'chest' ? 0xffd700 : 0x00d2d3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ringGroup.add(ring);

    const beamGeo = new THREE.CylinderGeometry(0.1, 0.8, 4, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: type === 'chest' ? 0xfff275 : 0x48dbfb,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 2;
    ringGroup.add(beam);

    const diamondGeo = new THREE.OctahedronGeometry(0.35, 0);
    const diamondMat = new THREE.MeshLambertMaterial({
      color: type === 'chest' ? 0xffa502 : 0x00d2d3,
      emissive: type === 'chest' ? 0xff6348 : 0x0abde3,
      emissiveIntensity: 0.6
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 2.8;
    ringGroup.add(diamond);

    scene.add(ringGroup);

    animatedUpdaters.push((delta, time) => {
      diamond.rotation.y += delta * 1.5;
      diamond.position.y = 2.8 + Math.sin(time * 3) * 0.2;
      beam.rotation.y -= delta * 0.8;

      if (taskId && passport.isTaskCompleted(taskId)) {
        ringMat.color.setHex(0x2ed573);
        diamondMat.color.setHex(0x2ed573);
        diamondMat.emissive.setHex(0x26de81);
        beamMat.color.setHex(0x7bed9f);
      }
    });

    const trigger = {
      x,
      z,
      radius: 3.2,
      type,
      label,
      taskId,
      mesh: ringGroup
    };
    interactiveObjects.push(trigger);
    return trigger;
  }

  // ==========================================
  // A. 中央起點廣場：旅人任務板與文化寶箱
  // ==========================================
  createSignpost('旅人起點・任務佈告板', -6, 0, 1.5, Math.PI);
  createCentralPlaza(scene, animatedUpdaters, createInteractiveRing);

  // ==========================================
  // B. 景點一：湯圍溝溫泉公園 (-35, 0, -15)
  // ==========================================
  createSignpost('♨ 湯圍溝溫泉公園 ♨', -35, 0, -5, Math.PI);
  buildTangweigouPark(scene, animatedUpdaters, createInteractiveRing);

  // ==========================================
  // C. 景點二：礁溪協天廟 (35, 0, -25)
  // ==========================================
  createSignpost('⛩ 礁溪協天廟 ⛩', 35, 0, -15, Math.PI);
  buildXietianTemple(scene, animatedUpdaters, createInteractiveRing);

  // ==========================================
  // D. 景點三：五峰旗風景特定區 (0, 0, 54)
  // ==========================================
  createSignpost('🌲 五峰旗風景特定區 🌲', 0, 0, 36, 0);
  buildWufengqiFalls(scene, animatedUpdaters, createInteractiveRing);

  // ==========================================
  // E. 隱藏終極彩蛋：金色巨大關公像與開發者秘密留言紙條 (14.0, 0, -58.0)
  // ==========================================
  buildGoldenGuanYuEasterEgg(scene, animatedUpdaters, createInteractiveRing, colliders);

  // 散佈植被（樹木均具備實體樹幹碰撞，不可穿越）
  populateVegetation(scene, colliders);

  return {
    interactiveObjects,
    animatedUpdaters,
    colliders
  };
}

// 晴空 Low-Poly 白雲飄動
function createSkyClouds(scene, animatedUpdaters) {
  const cloudsGroup = new THREE.Group();
  const cloudCount = 14;
  const clouds = [];

  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    roughness: 0.8
  });

  for (let i = 0; i < cloudCount; i++) {
    const cloud = new THREE.Group();
    const partsCount = 4 + Math.floor(Math.random() * 3);
    for (let p = 0; p < partsCount; p++) {
      const radius = 2.5 + Math.random() * 2.0;
      const partGeo = new THREE.DodecahedronGeometry(radius, 1);
      const part = new THREE.Mesh(partGeo, cloudMat);
      part.position.set((p - partsCount / 2) * 2.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2);
      cloud.add(part);
    }

    const x = (Math.random() - 0.5) * 220;
    const y = 32 + Math.random() * 14;
    const z = (Math.random() - 0.5) * 220;
    cloud.position.set(x, y, z);
    cloud.speed = 1.2 + Math.random() * 1.5;

    clouds.push(cloud);
    cloudsGroup.add(cloud);
  }

  scene.add(cloudsGroup);

  animatedUpdaters.push((delta) => {
    clouds.forEach(c => {
      c.position.x += c.speed * delta;
      if (c.position.x > 120) {
        c.position.x = -120;
      }
    });
  });
}

// 宜蘭雪山山脈群峰環抱地貌 ＆ 太平洋龜山島地標遠景
function createDistantMountainBackdrop(scene) {
  const mountainGroup = new THREE.Group();

  // 1. 北方與西北方遠景高聳雪山山脈（五峰旗後方與連綿山嶺）
  const peakDefs = [
    // 北方主脊（五峰旗後方層疊群峰）
    { x: -55, z: 98, r: 24, h: 42, color: 0x243d2c },
    { x: -28, z: 104, r: 26, h: 46, color: 0x2d4d36 },
    { x: 0, z: 110, r: 28, h: 52, color: 0x385e42 },
    { x: 30, z: 102, r: 25, h: 44, color: 0x243d2c },
    { x: 62, z: 95, r: 22, h: 38, color: 0x2d4d36 },
    // 西北方連峰（自五峰旗往湯圍溝延伸）
    { x: -85, z: 82, r: 22, h: 36, color: 0x385e42 },
    { x: -98, z: 52, r: 24, h: 38, color: 0x243d2c },
    { x: -105, z: 18, r: 26, h: 40, color: 0x2d4d36 },
    { x: -102, z: -25, r: 24, h: 36, color: 0x385e42 },
    { x: -96, z: -62, r: 22, h: 34, color: 0x243d2c },
    { x: -78, z: -88, r: 20, h: 32, color: 0x2d4d36 },
    // 遠處第二層大氣淡青霧靄山嶺
    { x: -40, z: 140, r: 35, h: 65, color: 0x486b53 },
    { x: 15, z: 145, r: 38, h: 72, color: 0x41694b },
    { x: 75, z: 135, r: 32, h: 60, color: 0x486b53 }
  ];

  peakDefs.forEach(p => {
    const geo = new THREE.ConeGeometry(p.r, p.h, 7);
    const mat = new THREE.MeshLambertMaterial({
      color: p.color,
      flatShading: true
    });
    const peak = new THREE.Mesh(geo, mat);
    peak.position.set(p.x, p.h / 2 - 2, p.z);
    mountainGroup.add(peak);
  });

  // 2. 東方太平洋遠景：宜蘭精神地標「龜山島」剪影 (Guishan Island)
  const guishanGroup = new THREE.Group();
  guishanGroup.position.set(135, 0, -20);
  guishanGroup.rotation.y = -0.15;

  const turtleMat = new THREE.MeshLambertMaterial({ color: 0x3b5a45, flatShading: true });

  // 龜甲主峰
  const shell = new THREE.Mesh(new THREE.ConeGeometry(12, 14, 8), turtleMat);
  shell.position.set(0, 6, 0);
  shell.scale.set(1.4, 0.85, 0.9);
  guishanGroup.add(shell);

  // 龜首（朝向東南方）
  const head = new THREE.Mesh(new THREE.ConeGeometry(6, 9, 6), turtleMat);
  head.position.set(12, 3.8, 4);
  head.scale.set(1.1, 0.75, 0.9);
  guishanGroup.add(head);

  // 龜尾平緩延伸岩壁
  const tail = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 5), turtleMat);
  tail.position.set(-8, 1.2, -1);
  guishanGroup.add(tail);

  mountainGroup.add(guishanGroup);
  scene.add(mountainGroup);
}

// 耀眼暖陽與大氣日芒
function createSunAndAtmosphere(scene) {
  const sunGroup = new THREE.Group();
  sunGroup.position.set(65, 110, 50);

  // 太陽本體發光球
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(6.5, 16, 16), sunMat);
  sunGroup.add(sunMesh);

  // 外層柔和日暈光環
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffeaa7,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide
  });
  const haloMesh = new THREE.Mesh(new THREE.RingGeometry(6.6, 15.5, 24), haloMat);
  haloMesh.lookAt(-65, -110, -50);
  sunGroup.add(haloMesh);

  scene.add(sunGroup);
}

// 道路與石燈籠引路系統（套用瀝青材質與斑馬線）
function createRoadsAndLanterns(scene) {
  const asphaltTex = createAsphaltTexture();
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.9,
    metalness: 0.1
  });

  // 主幹街道（東西走向，連通湯圍溝與協天廟）
  const roadX = new THREE.Mesh(new THREE.PlaneGeometry(100, 6.8), roadMat);
  roadX.rotation.x = -Math.PI / 2;
  roadX.position.set(0, 0.02, -5);
  roadX.receiveShadow = true;
  scene.add(roadX);

  // 往五峰旗山道（南北走向）
  const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 68), roadMat);
  roadZ.rotation.x = -Math.PI / 2;
  roadZ.position.set(0, 0.02, 24);
  roadZ.receiveShadow = true;
  scene.add(roadZ);

  // 十字路口斑馬線 (Crosswalks)
  const crosswalkTex = createCrosswalkTexture();
  const crosswalkMat = new THREE.MeshBasicMaterial({ map: crosswalkTex, transparent: true, opacity: 0.9 });

  const cwNorth = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), crosswalkMat);
  cwNorth.rotation.x = -Math.PI / 2;
  cwNorth.position.set(0, 0.03, -0.6);
  scene.add(cwNorth);

  const cwSouth = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), crosswalkMat);
  cwSouth.rotation.x = -Math.PI / 2;
  cwSouth.position.set(0, 0.03, -9.4);
  scene.add(cwSouth);

  // 沿途引路景觀石燈籠
  const lanternPoints = [
    [-25, -2], [-15, -2], [15, -2], [25, -2],
    [-25, -8], [-15, -8], [15, -8], [25, -8],
    [-4.0, 10], [4.0, 10], [-4.0, 22], [4.0, 22], [-4.0, 34], [4.0, 34],
    [-4.0, 44], [4.0, 44]
  ];

  lanternPoints.forEach(([lx, lz]) => {
    createStoneLantern(scene, lx, 0, lz);
  });
}

// 典雅日式石燈籠
function createStoneLantern(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffeaa7 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.3, 6), stoneMat);
  base.position.y = 0.15;
  group.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.9, 6), stoneMat);
  post.position.y = 0.75;
  group.add(post);

  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.15, 6), stoneMat);
  tray.position.y = 1.25;
  group.add(tray);

  const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), lightMat);
  chamber.position.y = 1.48;
  group.add(chamber);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.25, 6), stoneMat);
  cap.position.y = 1.75;
  group.add(cap);

  parent.add(group);
}

// 礁溪在地溫泉商圈生活街景群（飯店、特產行、小吃店、長椅、販賣機）
function buildJiaoxiTownBuildings(scene, colliders) {
  // 建築 A：礁溪溫泉大飯店
  createHotelBuilding(scene, -18, 0, 8, '♨ 礁溪溫泉大飯店 ♨', 0xdfe6e9);
  colliders.push({ type: 'box', minX: -26.0, maxX: -10.0, minZ: 2.5, maxZ: 13.5 });

  // 建築 B：水漾溫泉度假會館
  createHotelBuilding(scene, 18, 0, 8, '♨ 水漾溫泉會館 ♨', 0xdcdde1);
  colliders.push({ type: 'box', minX: 10.0, maxX: 26.0, minZ: 2.5, maxZ: 13.5 });

  // 建築 C：宜蘭名產特產伴手禮行
  createShopBuilding(scene, -18, 0, -14, '★ 宜蘭名產・牛舌餅特產店 ★', 0xf5f6fa, '#e74c3c');
  colliders.push({ type: 'box', minX: -25.5, maxX: -10.5, minZ: -19.0, maxZ: -9.0 });

  // 建築 D：礁溪溫泉拉麵・蔥油餅小吃舖
  createShopBuilding(scene, 18, 0, -14, '🍜 礁溪蔥油餅・溫泉小吃舖 🍜', 0xf1ebd9, '#d35400');
  colliders.push({ type: 'box', minX: 10.5, maxX: 25.5, minZ: -19.0, maxZ: -9.0 });

  // 街邊生活細節：木長椅與紅色自動販賣機
  createStreetBench(scene, -6, 0, -1.8);
  createStreetBench(scene, 6, 0, -1.8);
  createStreetBench(scene, -6, 0, -8.2);
  createStreetBench(scene, 6, 0, -8.2);

  createVendingMachine(scene, -8.5, 0, -1.5);
  colliders.push({ type: 'box', minX: -9.1, maxX: -7.9, minZ: -2.0, maxZ: -1.0 });

  createVendingMachine(scene, 8.5, 0, -1.5);
  colliders.push({ type: 'box', minX: 7.9, maxX: 9.1, minZ: -2.0, maxZ: -1.0 });
}

// 註冊三大景點與中央廣場的實體障礙碰撞體（全地圖零穿模體系）
function registerWorldColliders(colliders) {
  // 1. 中央廣場任務佈告板
  colliders.push({ type: 'box', minX: -2.2, maxX: 2.2, minZ: -3.4, maxZ: -2.8 });

  // 2. 文化寶箱
  colliders.push({ type: 'box', minX: 3.4, maxX: 4.6, minZ: -0.6, maxZ: 0.6 });

  // 3. 街區木長椅 (4張)
  colliders.push({ type: 'box', minX: -7.2, maxX: -4.8, minZ: -2.3, maxZ: -1.3 });
  colliders.push({ type: 'box', minX: 4.8, maxX: 7.2, minZ: -2.3, maxZ: -1.3 });
  colliders.push({ type: 'box', minX: -7.2, maxX: -4.8, minZ: -8.7, maxZ: -7.7 });
  colliders.push({ type: 'box', minX: 4.8, maxX: 7.2, minZ: -8.7, maxZ: -7.7 });

  // 4. 三大景區大型雙面立牌看板
  // 湯圍溝入口看板 (-35, -5)
  colliders.push({ type: 'box', minX: -37.2, maxX: -32.8, minZ: -5.6, maxZ: -4.4 });
  // 協天廟入口看板 (35, -15)
  colliders.push({ type: 'box', minX: 32.8, maxX: 37.2, minZ: -15.6, maxZ: -14.4 });
  // 五峰旗入口看板 (0, 36)
  colliders.push({ type: 'box', minX: -2.2, maxX: 2.2, minZ: 35.4, maxZ: 36.6 });

  // 5. 五大任務展台與實體道具（碰撞體精準包覆於展架本體，不阻礙玩家踏入互動圓圈）
  // 任務一：湯圍泉質告示牌本體 (-39, -16.0)
  colliders.push({ type: 'box', minX: -39.8, maxX: -38.2, minZ: -16.5, maxZ: -15.5 });
  // 任務二：溫泉農產蔬果籃本體 (-31, -16.0)
  colliders.push({ type: 'circle', x: -31.0, z: -16.0, radius: 0.7 });
  // 任務三：蠶絲神像展架本體 (29.5, -16.2)
  colliders.push({ type: 'box', minX: 28.7, maxX: 30.3, minZ: -16.7, maxZ: -15.7 });
  // 任務四：春祭乞龜祝壽供桌本體 (40.5, -16.2)
  colliders.push({ type: 'box', minX: 39.5, maxX: 41.5, minZ: -16.8, maxZ: -15.6 });
  // 任務五：觀瀑明信片展台本體 (0, 45.2)
  colliders.push({ type: 'box', minX: -0.9, maxX: 0.9, minZ: 44.7, maxZ: 45.7 });

  // 6. 協天廟大殿主體（阻擋穿入紅牆，保留開闊前殿中庭與通道）
  colliders.push({ type: 'box', minX: 26.2, maxX: 43.8, minZ: -33.2, maxZ: -20.2 });
  // 協天廟石獅子一對
  colliders.push({ type: 'box', minX: 29.3, maxX: 30.7, minZ: -17.2, maxZ: -15.8 });
  colliders.push({ type: 'box', minX: 39.3, maxX: 40.7, minZ: -17.2, maxZ: -15.8 });
  // 協天廟天公爐
  colliders.push({ type: 'circle', x: 35.0, z: -17.2, radius: 0.95 });
  // 協天廟山門四柱
  colliders.push({ type: 'circle', x: 30.5, z: -11.5, radius: 0.4 });
  colliders.push({ type: 'circle', x: 33.2, z: -11.5, radius: 0.4 });
  colliders.push({ type: 'circle', x: 36.8, z: -11.5, radius: 0.4 });
  colliders.push({ type: 'circle', x: 39.5, z: -11.5, radius: 0.4 });

  // 7. 湯圍溝泡腳池（石砌凸出基台，阻擋踩入池中穿模）
  colliders.push({ type: 'box', minX: -40.2, maxX: -29.8, minZ: -18.4, maxZ: -11.6 });
  // 湯圍溝四根木柱
  colliders.push({ type: 'circle', x: -43.0, z: -21.0, radius: 0.35 });
  colliders.push({ type: 'circle', x: -27.0, z: -21.0, radius: 0.35 });
  colliders.push({ type: 'circle', x: -43.0, z: -9.0, radius: 0.35 });
  colliders.push({ type: 'circle', x: -27.0, z: -9.0, radius: 0.35 });
  // 湯圍溝木棧道護欄（保留中央寬敞迎賓入口 x in [-38.5, -31.5]，絕不封堵進出）
  colliders.push({ type: 'box', minX: -45.0, maxX: -25.0, minZ: -23.2, maxZ: -22.4 }); // 南側護欄
  colliders.push({ type: 'box', minX: -45.0, maxX: -38.5, minZ: -7.6, maxZ: -6.8 }); // 北側左翼護欄
  colliders.push({ type: 'box', minX: -31.5, maxX: -25.0, minZ: -7.6, maxZ: -6.8 }); // 北側右翼護欄
  // 湯圍溝石燈籠
  colliders.push({ type: 'circle', x: -43.5, z: -8.5, radius: 0.5 });
  colliders.push({ type: 'circle', x: -26.5, z: -8.5, radius: 0.5 });

  // 8. 五峰旗後方巨型斷崖山岩（阻擋穿過岩壁掉進山體）
  colliders.push({ type: 'box', minX: -26.0, maxX: 26.0, minZ: 53.0, maxZ: 85.0 });
  // 五峰旗瀑布深潭
  colliders.push({ type: 'circle', x: 0, z: 54.0, radius: 8.6 });
  // 五峰旗觀瀑涼亭立柱
  colliders.push({ type: 'circle', x: -4.5, z: 41.0, radius: 0.4 });
  colliders.push({ type: 'circle', x: 4.5, z: 41.0, radius: 0.4 });
  colliders.push({ type: 'circle', x: -4.5, z: 48.0, radius: 0.4 });
  colliders.push({ type: 'circle', x: 4.5, z: 48.0, radius: 0.4 });

  // 9. 中央步道兩側日式石燈籠 (8座)
  const lanternPoints = [
    [-4.0, 12], [4.0, 12],
    [-4.0, 24], [4.0, 24],
    [-4.0, 34], [4.0, 34],
    [-4.0, 44], [4.0, 44]
  ];
  lanternPoints.forEach(([lx, lz]) => {
    colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.45 });
  });
}

// 溫泉度假飯店大樓（多層、景觀窗、頂樓招牌）
function createHotelBuilding(scene, x, y, z, hotelName, wallColor) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1b263b,
    metalness: 0.85,
    roughness: 0.15
  });

  // 主樓體（寬 15m, 高 16m, 深 10m）
  const body = new THREE.Mesh(new THREE.BoxGeometry(15, 16, 10), wallMat);
  body.position.y = 8;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 多層落地景觀窗
  for (let floor = 1; floor <= 4; floor++) {
    for (let winX = -5.2; winX <= 5.2; winX += 2.6) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), windowMat);
      win.position.set(winX, floor * 3.4 - 1.0, 5.05);
      group.add(win);
    }
  }

  // 頂樓醒目發光招牌
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 96;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#0c2461';
  sctx.fillRect(0, 0, 512, 96);
  sctx.strokeStyle = '#f6b93b';
  sctx.lineWidth = 6;
  sctx.strokeRect(4, 4, 504, 88);
  sctx.fillStyle = '#f6b93b';
  sctx.font = 'bold 36px sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText(hotelName, 256, 48);

  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.2), new THREE.MeshBasicMaterial({ map: signTex }));
  signMesh.position.set(0, 15.2, 5.06);
  group.add(signMesh);

  scene.add(group);
}

// 伴手禮名產店與小吃舖
function createShopBuilding(scene, x, y, z, shopName, wallColor, awningColor) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
  const shopBody = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 9), wallMat);
  shopBody.position.y = 3.5;
  shopBody.castShadow = true;
  shopBody.receiveShadow = true;
  group.add(shopBody);

  // 一樓明亮玻璃展示櫥窗
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x48dbfb, roughness: 0.1, metalness: 0.7 });
  const showcase = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.2), glassMat);
  showcase.position.set(0, 2.2, 4.55);
  group.add(showcase);

  // 遮陽帆布雨棚（斜板條紋）
  const awningMat = new THREE.MeshLambertMaterial({ color: awningColor });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 2.5), awningMat);
  awning.rotation.x = Math.PI / 8;
  awning.position.set(0, 4.2, 5.2);
  awning.castShadow = true;
  group.add(awning);

  // 店面大招牌
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = awningColor;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shopName, 256, 48);

  const tex = new THREE.CanvasTexture(canvas);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.8), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(0, 5.8, 4.56);
  group.add(sign);

  scene.add(group);
}

// 街角休閒木長椅
function createStreetBench(scene, x, y, z) {
  const bench = new THREE.Group();
  bench.position.set(x, y, z);

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8d5524 });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x2f3542 });

  // 椅面
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.6), woodMat);
  seat.position.y = 0.45;
  bench.add(seat);

  // 椅背
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.08), woodMat);
  back.position.set(0, 0.72, -0.28);
  bench.add(back);

  // 鐵腳
  [-0.8, 0.8].forEach(bx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.6), metalMat);
    leg.position.set(bx, 0.22, 0);
    bench.add(leg);
  });

  scene.add(bench);
}

// 經典紅色自動飲料販賣機
function createVendingMachine(scene, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xee5253 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.8), bodyMat);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  // 飲料展示亮面櫥窗
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.9), windowMat);
  win.position.set(0, 1.25, 0.41);
  group.add(win);

  // 投幣口與取物口
  const outletMat = new THREE.MeshLambertMaterial({ color: 0x2f3542 });
  const outlet = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.1), outletMat);
  outlet.position.set(0, 0.35, 0.41);
  group.add(outlet);

  scene.add(group);
}

// 中央起點廣場與文化寶箱
function createCentralPlaza(scene, animatedUpdaters, createRing) {
  const plazaGeo = new THREE.CylinderGeometry(8, 8.2, 0.2, 32);
  const plazaMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.set(0, 0.1, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);

  const boardGroup = new THREE.Group();
  boardGroup.position.set(0, 0, -3);

  const standMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), standMat);
  leg1.position.set(-2, 1.5, 0);
  const leg2 = leg1.clone();
  leg2.position.set(2, 1.5, 0);
  boardGroup.add(leg1, leg2);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 0.2), standMat);
  frame.position.set(0, 2.4, 0);
  boardGroup.add(frame);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fef9e7';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#b71540';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('【礁溪尋寶・旅人任務板】', 256, 45);

  ctx.fillStyle = '#2c3e50';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('1. 湯圍溝公園：溫泉水質告示牌（美人湯）', 40, 90);
  ctx.fillText('2. 湯圍溝公園：溫泉農產蔬果籃（水蕹菜）', 40, 125);
  ctx.fillText('3. 礁溪協天廟：關帝鎮廟文化卡（蠶絲神像）', 40, 160);
  ctx.fillText('4. 礁溪協天廟：春祭乞龜祝壽桌（平安壽龜）', 40, 195);
  ctx.fillText('5. 五峰旗山區：觀瀑明信片展架（三層飛瀑）', 40, 230);

  const texture = new THREE.CanvasTexture(canvas);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.9), new THREE.MeshBasicMaterial({ map: texture }));
  poster.position.set(0, 2.4, 0.12);
  boardGroup.add(poster);
  scene.add(boardGroup);

  const chestGroup = new THREE.Group();
  chestGroup.position.set(4, 0.2, 0);

  const chestBottomMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const chestGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 });

  const chestBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.0), chestBottomMat);
  chestBase.position.y = 0.4;
  chestBase.castShadow = true;
  chestGroup.add(chestBase);

  const chestLidGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16, 1, false, 0, Math.PI);
  const chestLid = new THREE.Mesh(chestLidGeo, chestBottomMat);
  chestLid.rotation.z = Math.PI / 2;
  chestLid.position.set(0, 0.8, 0);
  chestLid.castShadow = true;
  chestGroup.add(chestLid);

  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.1), chestGoldMat);
  lock.position.set(0, 0.6, 0.52);
  chestGroup.add(lock);

  scene.add(chestGroup);
  createRing(4, 0, '文化寶箱（集滿五印開啟）', 'chest');
}

// 景點一：湯圍溝溫泉公園（真實實木木紋木棧道）
function buildTangweigouPark(scene, animatedUpdaters, createRing) {
  const root = new THREE.Group();
  root.position.set(-35, 0, -15);

  const woodDeckTex = createWoodDeckTexture();
  const deckMat = new THREE.MeshStandardMaterial({
    map: woodDeckTex,
    roughness: 0.8,
    metalness: 0.1
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(20, 0.12, 16), deckMat);
  deck.position.set(0, 0.06, 0);
  deck.receiveShadow = true;
  root.add(deck);

  const railMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  // 南側完整護欄
  const southRailTop = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.12, 0.12), railMat);
  southRailTop.position.set(0, 1.0, -7.8);
  root.add(southRailTop);
  for (let rx = -9; rx <= 9; rx += 3) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), railMat);
    post.position.set(rx, 0.55, -7.8);
    root.add(post);
  }

  // 北側迎賓入口兩翼護欄（中央留出 6.6m 開闊走道，方便旅人流暢步入公園）
  [-6.5, 6.5].forEach(cx => {
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.12, 0.12), railMat);
    railTop.position.set(cx, 1.0, 7.8);
    root.add(railTop);

    for (let rx = cx - 2.5; rx <= cx + 2.5; rx += 2.5) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), railMat);
      post.position.set(rx, 0.55, 7.8);
      root.add(post);
    }
  });

  const poolMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
  const poolBorder = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.6, 6.2), poolMat);
  poolBorder.position.set(0, 0.4, 0);
  root.add(poolBorder);

  // 溫泉水面（具備動態微波波光）
  const waterGeo = new THREE.PlaneGeometry(8.8, 5.4, 16, 16);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1e88e5,
    roughness: 0.12,
    metalness: 0.45,
    transparent: true,
    opacity: 0.85
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.65, 0);
  root.add(water);

  const steamGeo = new THREE.BufferGeometry();
  const steamCount = 55;
  const steamPos = new Float32Array(steamCount * 3);
  for (let i = 0; i < steamCount; i++) {
    steamPos[i * 3] = (Math.random() - 0.5) * 7.5;
    steamPos[i * 3 + 1] = Math.random() * 3.5 + 0.5;
    steamPos[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.42,
    transparent: true,
    opacity: 0.55
  });
  const steam = new THREE.Points(steamGeo, steamMat);
  root.add(steam);

  createStoneLantern(root, -8.5, 0.4, 6.5);
  createStoneLantern(root, 8.5, 0.4, 6.5);

  animatedUpdaters.push((delta, time) => {
    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      pos.setZ(i, Math.sin(time * 3 + u * 1.5) * 0.04 + Math.cos(time * 2.5 + v * 1.5) * 0.04);
    }
    waterGeo.computeVertexNormals();
    pos.needsUpdate = true;

    const arr = steamGeo.attributes.position.array;
    for (let i = 0; i < steamCount; i++) {
      arr[i * 3 + 1] += delta * 0.95;
      arr[i * 3] += Math.sin(time * 2 + i) * 0.015;
      if (arr[i * 3 + 1] > 4.2) {
        arr[i * 3 + 1] = 0.5;
      }
    }
    steamGeo.attributes.position.needsUpdate = true;
  });

  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
  [[-8, -6], [8, -6], [-8, 6], [8, 6]].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.5), pillarMat);
    col.position.set(px, 2.9, pz);
    col.castShadow = true;
    root.add(col);
  });

  const roofGeo = new THREE.ConeGeometry(13.5, 2.4, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x212121, transparent: true, opacity: 0.85 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 6.8, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  root.add(roof);

  createPhotoDisplay(root, 'images/tangweigou.jpg', -7, 2.0, 6, '湯圍溝實景照片');
  scene.add(root);

  createRing(-39, -14.6, '任務一：溫泉水質告示牌', 'task', 'task_spring');
  createSignBoardObject(scene, -39, 0, -16.0, '湯圍泉質告示牌');

  createRing(-31, -14.6, '任務二：溫泉農產蔬果籃', 'task', 'task_crops');
  createCropBasketObject(scene, -31, 0, -16.0);
}

// 景點二：礁溪協天廟（古樸青石地磚廣場）
function buildXietianTemple(scene, animatedUpdaters, createRing) {
  const root = new THREE.Group();
  root.position.set(35, 0, -25);

  const cobblestoneTex = createCobblestoneTexture();
  const baseMat = new THREE.MeshStandardMaterial({
    map: cobblestoneTex,
    roughness: 0.9,
    metalness: 0.1
  });
  const templeBase = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 20), baseMat);
  templeBase.position.set(0, 0.06, 0);
  templeBase.receiveShadow = true;
  root.add(templeBase);

  const wallMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(17, 5.5, 13), wallMat);
  mainHall.position.set(0, 2.8, -1.5);
  mainHall.castShadow = true;
  root.add(mainHall);

  const roofMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
  const lowerRoof = new THREE.Mesh(new THREE.BoxGeometry(20, 1.3, 16), roofMat);
  lowerRoof.position.set(0, 5.7, -1.5);
  lowerRoof.castShadow = true;
  root.add(lowerRoof);

  const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(15, 1.5, 11), roofMat);
  upperRoof.position.set(0, 7.0, -1.5);
  upperRoof.castShadow = true;
  root.add(upperRoof);

  const colMat = new THREE.MeshLambertMaterial({ color: 0xd63031 });
  [-7, -2.5, 2.5, 7].forEach(cx => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 5.2, 16), colMat);
    pillar.position.set(cx, 2.7, 6.2);
    pillar.castShadow = true;
    root.add(pillar);
  });

  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.8, roughness: 0.4 });
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.3, 16), bronzeMat);
  burner.position.set(0, 0.7, 7.8);
  root.add(burner);

  const incenseGeo = new THREE.BufferGeometry();
  const incenseCount = 30;
  const incensePos = new Float32Array(incenseCount * 3);
  for (let i = 0; i < incenseCount; i++) {
    incensePos[i * 3] = (Math.random() - 0.5) * 0.4;
    incensePos[i * 3 + 1] = 1.3 + Math.random() * 2.5;
    incensePos[i * 3 + 2] = 7.8 + (Math.random() - 0.5) * 0.4;
  }
  incenseGeo.setAttribute('position', new THREE.BufferAttribute(incensePos, 3));
  const incenseMat = new THREE.PointsMaterial({ color: 0xdfe6e9, size: 0.28, transparent: true, opacity: 0.65 });
  const incense = new THREE.Points(incenseGeo, incenseMat);
  root.add(incense);

  createStoneLion(root, -5, 0, 8.5);
  createStoneLion(root, 5, 0, 8.5);
  createTemplePaifang(root, 0, 0, 13.5);

  animatedUpdaters.push((delta, time) => {
    const arr = incenseGeo.attributes.position.array;
    for (let i = 0; i < incenseCount; i++) {
      arr[i * 3 + 1] += delta * 0.85;
      arr[i * 3] += Math.sin(time * 3 + i) * 0.012;
      if (arr[i * 3 + 1] > 4.5) {
        arr[i * 3 + 1] = 1.3;
      }
    }
    incenseGeo.attributes.position.needsUpdate = true;
  });

  createPhotoDisplay(root, 'images/xietian_temple.jpg', 9, 1.6, 6, '協天廟實景照片');
  scene.add(root);

  createRing(29.5, -15.0, '任務三：協天廟文化展架', 'task', 'task_temple');
  createSignBoardObject(scene, 29.5, 0, -16.2, '蠶絲神像展架');

  createRing(40.5, -15.0, '任務四：春祭乞龜祝壽供桌', 'task', 'task_turtle');
  createTurtleAltarObject(scene, 40.5, 0, -16.2);
}

function createStoneLion(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const lionMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.2), lionMat);
  plinth.position.y = 0.3;
  group.add(plinth);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.9), lionMat);
  body.position.set(0, 0.9, -0.1);
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), lionMat);
  head.position.set(0, 1.45, 0.25);
  group.add(head);

  parent.add(group);
}

function createTemplePaifang(parent, x, y, z) {
  const paifang = new THREE.Group();
  paifang.position.set(x, y, z);

  const colMat = new THREE.MeshLambertMaterial({ color: 0xb71540 });
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });

  [-4.5, -1.8, 1.8, 4.5].forEach(colX => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 6.0, 16), colMat);
    col.position.set(colX, 3.0, 0);
    col.castShadow = true;
    paifang.add(col);
  });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.6, 0.4), colMat);
  beam.position.set(0, 5.2, 0);
  paifang.add(beam);

  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 256;
  plaqueCanvas.height = 64;
  const pctx = plaqueCanvas.getContext('2d');
  pctx.fillStyle = '#1e272e';
  pctx.fillRect(0, 0, 256, 64);
  pctx.strokeStyle = '#ffd700';
  pctx.lineWidth = 4;
  pctx.strokeRect(2, 2, 252, 60);
  pctx.fillStyle = '#ffd700';
  pctx.font = 'bold 24px serif';
  pctx.textAlign = 'center';
  pctx.textBaseline = 'middle';
  pctx.fillText('敕建協天廟', 128, 32);

  const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: plaqueTex, side: THREE.DoubleSide }));
  plaque.position.set(0, 4.4, 0.22);
  paifang.add(plaque);

  const paifangRoof = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.7, 1.2), goldMat);
  paifangRoof.position.set(0, 5.8, 0);
  paifangRoof.castShadow = true;
  paifang.add(paifangRoof);

  parent.add(paifang);
}

// 景點三：五峰旗風景特定區（真實三層動態奔騰飛瀑與自然岩壁峽谷）
function buildWufengqiFalls(scene, animatedUpdaters, createRing) {
  const root = new THREE.Group();
  root.position.set(0, 0, 54);

  // 自然岩石與苔蘚材質（杜絕單調黑色方塊，呈現自然地質層理）
  const rockMat1 = new THREE.MeshLambertMaterial({ color: 0x576574, flatShading: true });
  const rockMat2 = new THREE.MeshLambertMaterial({ color: 0x485460, flatShading: true });
  const mossMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true });

  // 1. 分層階梯式自然岩壁峽谷（低中高三層基底岩階）
  // 底層岩壁台階 (y: 0 ~ 8)
  const lowerCliffL = new THREE.Mesh(new THREE.DodecahedronGeometry(8.5, 1), rockMat1);
  lowerCliffL.position.set(-10, 4.5, 6);
  lowerCliffL.scale.set(1.4, 0.9, 1.2);
  lowerCliffL.castShadow = true;
  root.add(lowerCliffL);

  const lowerCliffR = new THREE.Mesh(new THREE.DodecahedronGeometry(8.5, 1), rockMat1);
  lowerCliffR.position.set(10, 4.5, 6);
  lowerCliffR.scale.set(1.4, 0.9, 1.2);
  lowerCliffR.castShadow = true;
  root.add(lowerCliffR);

  // 中層岩壁平台 (y: 8 ~ 18)
  const midCliffL = new THREE.Mesh(new THREE.DodecahedronGeometry(9.0, 1), rockMat2);
  midCliffL.position.set(-8, 13, 9);
  midCliffL.scale.set(1.3, 1.1, 1.1);
  midCliffL.castShadow = true;
  root.add(midCliffL);

  const midCliffR = new THREE.Mesh(new THREE.DodecahedronGeometry(9.0, 1), rockMat2);
  midCliffR.position.set(8, 13, 9);
  midCliffR.scale.set(1.3, 1.1, 1.1);
  midCliffR.castShadow = true;
  root.add(midCliffR);

  // 頂層山峽主崖壁 (y: 18 ~ 30)
  const upperCliffL = new THREE.Mesh(new THREE.DodecahedronGeometry(9.5, 1), rockMat1);
  upperCliffL.position.set(-7, 22, 12);
  upperCliffL.scale.set(1.2, 1.2, 1.0);
  upperCliffL.castShadow = true;
  root.add(upperCliffL);

  const upperCliffR = new THREE.Mesh(new THREE.DodecahedronGeometry(9.5, 1), rockMat1);
  upperCliffR.position.set(7, 22, 12);
  upperCliffR.scale.set(1.2, 1.2, 1.0);
  upperCliffR.castShadow = true;
  root.add(upperCliffR);

  // 峽谷後方厚實襯底山壁（自然岩色，具備斜度與深淺陰影）
  const backCliffGeo = new THREE.BoxGeometry(44, 28, 12);
  const backCliff = new THREE.Mesh(backCliffGeo, rockMat2);
  backCliff.position.set(0, 15, 15);
  backCliff.castShadow = true;
  root.add(backCliff);

  // 崖頂苔蘚綠植階地
  const mossLedge1 = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 6), mossMat);
  mossLedge1.position.set(-8, 9.2, 6.5);
  root.add(mossLedge1);

  const mossLedge2 = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 6), mossMat);
  mossLedge2.position.set(8, 9.2, 6.5);
  root.add(mossLedge2);

  // 2. 後方五座如戰場旌旗的並列尖峰（五峰旗地標名稱由來）
  const peakMat = new THREE.MeshLambertMaterial({ color: 0x1e5631, flatShading: true });
  [-17, -8.5, 0, 8.5, 17].forEach((px, idx) => {
    const height = idx === 2 ? 46 : (idx === 1 || idx === 3 ? 38 : 32);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(7.5, height, 6), peakMat);
    peak.position.set(px, height / 2 + 10, 20);
    peak.castShadow = true;
    root.add(peak);
  });

  // 3. 真實三層動態奔流瀑布系統（採用真實水沫流動貼圖 ＆ 三層立體層疊）
  const waterfallTex = createWaterfallTexture();

  // 瀑布外層：奔騰白浪水絲材質
  const fallMat = new THREE.MeshBasicMaterial({
    map: waterfallTex,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide
  });

  // 瀑布內核：清澈蔚藍激流水身材質（賦予深層立體水體感）
  const waterCoreMat = new THREE.MeshStandardMaterial({
    color: 0x00d2d3,
    roughness: 0.1,
    metalness: 0.35,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide
  });

  // [第一層・上層飛瀑] (高達 11 公尺，自高山峽谷頂端奔瀉直下)
  const fall1Group = new THREE.Group();
  fall1Group.position.set(0, 24.5, 9.5);
  const fall1Mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 11), fallMat);
  const fall1Core = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 11), waterCoreMat);
  fall1Core.position.z = -0.06;
  fall1Group.add(fall1Mesh, fall1Core);
  root.add(fall1Group);

  // 第一層與第二層交接處激濺浪花台
  const splash1Mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const splash1 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.0, 0.5, 16), splash1Mat);
  splash1.position.set(0, 19.0, 8.2);
  root.add(splash1);

  // [第二層・中層飛瀑] (自中段岩台奔流折疊傾瀉)
  const fall2Group = new THREE.Group();
  fall2Group.position.set(0, 13.8, 6.2);
  fall2Group.rotation.x = 0.08; // 順著岩壁微傾
  const fall2Mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 10.5), fallMat);
  const fall2Core = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 10.5), waterCoreMat);
  fall2Core.position.z = -0.06;
  fall2Group.add(fall2Mesh, fall2Core);
  root.add(fall2Group);

  // 第二層撞擊白浪翻滾水沫環
  const splash2 = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.8, 0.6, 16), splash1Mat);
  splash2.position.set(0, 8.6, 4.4);
  root.add(splash2);

  // [第三層・下層飛瀑] (最寬闊，滔滔奔流入底層深潭)
  const fall3Group = new THREE.Group();
  fall3Group.position.set(0, 4.5, 2.8);
  fall3Group.rotation.x = 0.12;
  const fall3Mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 9.2), fallMat);
  const fall3Core = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 9.2), waterCoreMat);
  fall3Core.position.z = -0.06;
  fall3Group.add(fall3Mesh, fall3Core);
  root.add(fall3Group);

  // 4. 底層天然深潭與環潭巨石群
  const pondMat = new THREE.MeshStandardMaterial({
    color: 0x00838f,
    roughness: 0.1,
    metalness: 0.45,
    transparent: true,
    opacity: 0.88
  });
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.45, 32), pondMat);
  pond.position.set(0, 0.22, 0);
  pond.receiveShadow = true;
  root.add(pond);

  // 環潭天然碎石抱擁
  for (let a = 0; a < Math.PI * 2; a += 0.38) {
    if (a > 3.6 && a < 5.8) continue; // 朝向觀瀑亭留出視野開口
    const bx = Math.cos(a) * 9.6;
    const bz = Math.sin(a) * 9.6;
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 + Math.random() * 0.4, 0), rockMat1);
    boulder.position.set(bx, 0.4, bz);
    boulder.rotation.set(Math.random(), Math.random(), Math.random());
    root.add(boulder);
  }

  // 5. 瀑布激起的水霧與負離子粒子（三層瀑潭水霧升騰飄渺）
  const mistGeo = new THREE.BufferGeometry();
  const mistCount = 110;
  const mistPos = new Float32Array(mistCount * 3);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = (Math.random() - 0.5) * 9.5;
    mistPos[i * 3 + 1] = Math.random() * 8.0 + 0.3;
    mistPos[i * 3 + 2] = (Math.random() - 0.5) * 8.5;
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.52,
    transparent: true,
    opacity: 0.68
  });
  const mist = new THREE.Points(mistGeo, mistMat);
  root.add(mist);

  // 6. 動態更新器：真實水流 UV 高速奔騰 ＆ 水花脈動 ＆ 水霧飄揚
  animatedUpdaters.push((delta, time) => {
    // 飛瀑 UV 垂直高速流動（奔流直下效果）
    waterfallTex.offset.y -= delta * 3.4;

    // 瀑布水幕左右翻滾微動
    fall1Group.scale.x = 1.0 + Math.sin(time * 7) * 0.035;
    fall2Group.scale.x = 1.0 + Math.cos(time * 6.5) * 0.04;
    fall3Group.scale.x = 1.0 + Math.sin(time * 8) * 0.045;

    // 水花撞擊台脈動呼吸
    splash1.scale.set(1.0 + Math.sin(time * 10) * 0.08, 1.0, 1.0 + Math.cos(time * 10) * 0.08);
    splash2.scale.set(1.0 + Math.cos(time * 9) * 0.09, 1.0, 1.0 + Math.sin(time * 9) * 0.09);

    // 水霧粒子升騰翻捲
    const arr = mistGeo.attributes.position.array;
    for (let i = 0; i < mistCount; i++) {
      arr[i * 3 + 1] += delta * 1.8;
      arr[i * 3] += Math.sin(time * 2.5 + i) * 0.02;
      if (arr[i * 3 + 1] > 8.5) {
        arr[i * 3 + 1] = 0.3;
      }
    }
    mistGeo.attributes.position.needsUpdate = true;
  });

  createViewingPavilion(root, 0, 0, -9.5);
  createPhotoDisplay(root, 'images/wufengqi.jpg', -4, 1.8, -8.5, '五峰旗實景照片');
  scene.add(root);

  createRing(0, 43.8, '任務五：五峰飛瀑觀景明信片', 'task', 'task_waterfall');
  createSignBoardObject(scene, 0, 0, 45.2, '觀瀑明信片展台');
}

function createViewingPavilion(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const deckMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
  const viewingDeck = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 9), deckMat);
  viewingDeck.position.y = 0.06;
  viewingDeck.receiveShadow = true;
  group.add(viewingDeck);

  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
  [[-4.5, -3.5], [4.5, -3.5], [-4.5, 3.5], [4.5, 3.5]].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.0), pillarMat);
    col.position.set(px, 2.0, pz);
    col.castShadow = true;
    group.add(col);
  });

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 2.4, 4), pillarMat);
  roof.position.set(0, 4.8, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  parent.add(group);
}

function createPhotoDisplay(parent, imgUrl, x, y, z, label) {
  const loader = new THREE.TextureLoader();
  loader.load(imgUrl, (texture) => {
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 0.15), frameMat);
    frame.position.set(x, y, z);

    const photoMat = new THREE.MeshBasicMaterial({ map: texture });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.0), photoMat);
    photo.position.set(x, y, z + 0.08);

    parent.add(frame, photo);
  });
}

function createSignBoardObject(scene, x, y, z, text) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const postMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2), postMat);
  post.position.y = 1.1;
  group.add(post);

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.1), new THREE.MeshLambertMaterial({ color: 0xd7ccc8 }));
  board.position.set(0, 1.8, 0);
  group.add(board);

  scene.add(group);
}

function createCropBasketObject(scene, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const basketMat = new THREE.MeshLambertMaterial({ color: 0xc8ad7f });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.7, 16), basketMat);
  basket.position.y = 0.35;
  group.add(basket);

  const greenMat = new THREE.MeshLambertMaterial({ color: 0x2ecc71 });
  for (let i = 0; i < 5; i++) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8), greenMat);
    stalk.position.set((Math.random() - 0.5) * 0.4, 0.7, (Math.random() - 0.5) * 0.4);
    stalk.rotation.z = (Math.random() - 0.5) * 0.4;
    group.add(stalk);
  }

  const tomatoMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
  for (let i = 0; i < 4; i++) {
    const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), tomatoMat);
    tomato.position.set((Math.random() - 0.5) * 0.5, 0.65, (Math.random() - 0.5) * 0.5);
    group.add(tomato);
  }

  scene.add(group);
}

function createTurtleAltarObject(scene, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const tableMat = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.2), tableMat);
  table.position.y = 0.45;
  group.add(table);

  const turtleMat = new THREE.MeshStandardMaterial({ color: 0xffa502, roughness: 0.3, metalness: 0.6 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), turtleMat);
  shell.scale.set(1.2, 0.6, 1.0);
  shell.position.set(0, 1.15, 0);
  group.add(shell);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), turtleMat);
  head.position.set(0, 1.15, 0.55);
  group.add(head);

  scene.add(group);
}

function populateVegetation(scene, colliders) {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
  const foliageMat1 = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  const foliageMat2 = new THREE.MeshLambertMaterial({ color: 0x388e3c });

  // 確定性偽隨機數生成器，確保每次生成的樹木與碰撞體精準一致
  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i < 75; i++) {
    const x = (pseudoRandom() - 0.5) * 190;
    const z = (pseudoRandom() - 0.5) * 190;

    if (Math.abs(x) < 14 && Math.abs(z) < 14) continue;
    if (Math.abs(z - (-5)) < 6.5 && Math.abs(x) < 55) continue;
    if (Math.abs(x) < 6.5 && z > 0 && z < 60) continue;
    // 避開三大景點核心區與入口通道
    if (x > -48 && x < -22 && z > -26 && z < -4) continue; // 湯圍溝溫泉公園
    if (x > 22 && x < 48 && z > -36 && z < -8) continue; // 礁溪協天廟
    if (x > -18 && x < 18 && z > 34 && z < 70) continue; // 五峰旗風景區

    // 避開商圈建築區域
    if (Math.abs(z - 8) < 8 && Math.abs(x - 18) < 10) continue;
    if (Math.abs(z - 8) < 8 && Math.abs(x - (-18)) < 10) continue;
    if (Math.abs(z - (-14)) < 8 && Math.abs(x - 18) < 10) continue;
    if (Math.abs(z - (-14)) < 8 && Math.abs(x - (-18)) < 10) continue;

    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.5, 6), trunkMat);
    trunk.position.y = 1.25;
    tree.add(trunk);

    const foliageHeight = 3.5 + pseudoRandom() * 2;
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.8 + pseudoRandom() * 0.6, foliageHeight, 6),
      pseudoRandom() > 0.5 ? foliageMat1 : foliageMat2
    );
    foliage.position.y = 2.5 + foliageHeight / 2;
    foliage.castShadow = true;
    tree.add(foliage);

    scene.add(tree);

    // 註冊樹幹實體碰撞圓柱體（半徑 0.45m，嚴防角色穿過樹木）
    if (colliders) {
      colliders.push({ type: 'circle', x, z, radius: 0.45 });
    }
  }
}

// ==============================================================
// 隱藏終極彩蛋：金色巨大關公像與開發者秘密留言紙條 (14.0, 0, -58.0)
// 初始隱藏於地底微光符石中，玩家主動調查時震撼召喚、拔地而起！
// ==============================================================
function buildGoldenGuanYuEasterEgg(scene, animatedUpdaters, createRing, colliders) {
  let isRevealed = false;
  let animating = false;
  let animProgress = 0;

  // 1. 初始隱藏的微光遠古符石（未喚醒前低調置於草地上）
  const runeGroup = new THREE.Group();
  runeGroup.position.set(14.0, 0, -58.2);

  const runeStoneMat = new THREE.MeshLambertMaterial({ color: 0x3d4447 });
  const runeStone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.16, 8), runeStoneMat);
  runeStone.position.y = 0.08;
  runeStone.receiveShadow = true;
  runeGroup.add(runeStone);

  const runeDiscMat = new THREE.MeshBasicMaterial({ color: 0xffa502, transparent: true, opacity: 0.8 });
  const runeDisc = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.42, 16), runeDiscMat);
  runeDisc.rotation.x = -Math.PI / 2;
  runeDisc.position.y = 0.17;
  runeGroup.add(runeDisc);

  const runeLight = new THREE.PointLight(0xffa502, 1.2, 5);
  runeLight.position.set(0, 0.5, 0);
  runeGroup.add(runeLight);

  scene.add(runeGroup);

  // 2. 巨大關公像群組（初始完全隱藏 scale 0）
  const eggGroup = new THREE.Group();
  eggGroup.position.set(14.0, 0, -61.0);
  eggGroup.visible = false;
  eggGroup.scale.set(0.001, 0.001, 0.001);

  // 金色反射高質感金屬材質
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.88,
    roughness: 0.22,
    emissive: 0xb7791f,
    emissiveIntensity: 0.15
  });

  const darkGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.9,
    roughness: 0.28
  });

  const capeMat = new THREE.MeshLambertMaterial({ color: 0x900c3f });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x2c3437 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe0f7fa, metalness: 0.95, roughness: 0.1 });

  // 雙層金邊蓮花石台基座
  const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.6, 4.4), stoneMat);
  plinthBase.position.y = 0.3;
  plinthBase.receiveShadow = true;
  plinthBase.castShadow = true;
  eggGroup.add(plinthBase);

  const plinthTop = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.4, 16), darkGoldMat);
  plinthTop.position.y = 0.7;
  plinthTop.castShadow = true;
  eggGroup.add(plinthTop);

  // 巨大關公像主體 (高達 6.5 公尺)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, 2.6, 12), goldMat);
  body.position.y = 2.1;
  body.castShadow = true;
  eggGroup.add(body);

  // 雙肩龍首護肩
  [-0.95, 0.95].forEach(sx => {
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 12), darkGoldMat);
    pauldron.position.set(sx, 3.1, 0);
    pauldron.castShadow = true;
    eggGroup.add(pauldron);
  });

  // 頭部與面容
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 16), goldMat);
  head.position.y = 3.8;
  head.castShadow = true;
  eggGroup.add(head);

  // 美髯公飄逸長鬚
  const beardUpper = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.4, 8), darkGoldMat);
  beardUpper.rotation.x = Math.PI;
  beardUpper.position.set(0, 2.8, 0.4);
  eggGroup.add(beardUpper);

  const beardLower = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 8), darkGoldMat);
  beardLower.rotation.x = Math.PI;
  beardLower.position.set(0, 2.0, 0.44);
  eggGroup.add(beardLower);

  // 關帝武冠神盔 (Crown)
  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 0.75, 12), darkGoldMat);
  helmet.position.y = 4.35;
  helmet.castShadow = true;
  eggGroup.add(helmet);

  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), goldMat);
  crest.position.y = 4.9;
  eggGroup.add(crest);

  // 背後大紅色武將披風
  const cape = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.2, 0.18), capeMat);
  cape.position.set(0, 2.4, -0.65);
  cape.castShadow = true;
  eggGroup.add(cape);

  // 青龍偃月刀 (長達 7.5 公尺神兵利器)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.2, 8), darkGoldMat);
  pole.position.set(1.4, 3.6, 0.35);
  pole.rotation.z = -0.12;
  pole.castShadow = true;
  eggGroup.add(pole);

  const dragonMouth = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), goldMat);
  dragonMouth.position.set(1.5, 6.4, 0.35);
  eggGroup.add(dragonMouth);

  const crescentBlade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.4, 0.08), bladeMat);
  crescentBlade.position.set(1.7, 7.3, 0.35);
  crescentBlade.rotation.z = 0.08;
  crescentBlade.castShadow = true;
  eggGroup.add(crescentBlade);

  // 金光神聖粒子特效 (金色光點冉冉升騰)
  const auraGeo = new THREE.BufferGeometry();
  const auraCount = 55;
  const auraPos = new Float32Array(auraCount * 3);
  for (let i = 0; i < auraCount; i++) {
    auraPos[i * 3] = (Math.random() - 0.5) * 5.0;
    auraPos[i * 3 + 1] = Math.random() * 6.5 + 0.5;
    auraPos[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
  }
  auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPos, 3));
  const auraMat = new THREE.PointsMaterial({
    color: 0xfff275,
    size: 0.35,
    transparent: true,
    opacity: 0.8
  });
  const auraParticles = new THREE.Points(auraGeo, auraMat);
  eggGroup.add(auraParticles);

  scene.add(eggGroup);

  // 3. 開發者秘密留言紙條石台 (初始隱藏)
  const noteGroup = new THREE.Group();
  noteGroup.position.set(14.0, 0, -58.8);
  noteGroup.visible = false;
  noteGroup.scale.set(0.001, 0.001, 0.001);

  const notePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.9, 12), stoneMat);
  notePedestal.position.y = 0.45;
  notePedestal.castShadow = true;
  noteGroup.add(notePedestal);

  const scrollRoll1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8), darkGoldMat);
  scrollRoll1.rotation.z = Math.PI / 2;
  scrollRoll1.position.set(0, 0.98, -0.22);
  noteGroup.add(scrollRoll1);

  const scrollRoll2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8), darkGoldMat);
  scrollRoll2.rotation.z = Math.PI / 2;
  scrollRoll2.position.set(0, 0.98, 0.22);
  noteGroup.add(scrollRoll2);

  // 展開的金色信紙與紅色火漆封印
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.4), paperMat);
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0, 0.96, 0);
  noteGroup.add(paper);

  const sealMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), sealMat);
  seal.rotation.x = -Math.PI / 2;
  seal.position.set(0, 0.97, 0);
  noteGroup.add(seal);

  // 柔和金光光暈
  const noteLight = new THREE.PointLight(0xffd700, 2.5, 9);
  noteLight.position.set(0, 1.4, 0);
  noteGroup.add(noteLight);

  scene.add(noteGroup);

  // 4. 註冊互動光圈（初始提示為神祕古印記，喚醒後變更為關公像留言）
  const trigger = createRing(14.0, -58.0, '【神秘古代印記】調查松樹下的微光符石', 'easter_egg', 'easter_egg_guanyu');

  // 5. 互動喚醒事件綁定
  window.__triggerEasterEggReveal = function(callback) {
    if (!isRevealed) {
      isRevealed = true;
      animating = true;
      animProgress = 0;
      eggGroup.visible = true;
      noteGroup.visible = true;

      // 更新互動標籤
      trigger.label = '【隱藏彩蛋】金色巨大關公像・開發者秘密留言';

      // 震撼拔地而起動畫完成後，開啟開發者紙條彈窗
      setTimeout(() => {
        if (callback) callback();
      }, 1500);

      // 喚醒後加入實體碰撞體，保護關公像與石台不被穿模
      if (colliders) {
        colliders.push({ type: 'box', minX: 11.8, maxX: 16.2, minZ: -63.2, maxZ: -59.5 });
        colliders.push({ type: 'circle', x: 14.0, z: -58.8, radius: 0.55 });
      }
    } else {
      // 若已喚醒過，再次調查直接開啟彈窗
      if (callback) callback();
    }
  };

  // 6. 動態更新器（微光符石呼吸發光 ＆ 拔地而起平滑動態 ＆ 金光粒子）
  animatedUpdaters.push((delta, time) => {
    if (!isRevealed) {
      // 未喚醒時：微光符石緩慢呼吸自轉發光
      runeLight.intensity = 1.0 + Math.sin(time * 3.0) * 0.45;
      runeDisc.rotation.z = time * 0.4;
    } else if (animating) {
      // 喚醒瞬間：平滑拔地而起（Ease-Out 曲線）
      animProgress = Math.min(1.0, animProgress + delta * 0.75);
      const ease = Math.sin((animProgress * Math.PI) / 2);

      eggGroup.scale.set(ease, ease, ease);
      eggGroup.position.y = (ease - 1.0) * 6.0;

      noteGroup.scale.set(ease, ease, ease);
      noteGroup.position.y = (ease - 1.0) * 1.5;

      runeGroup.scale.set(Math.max(0.001, 1.0 - ease), Math.max(0.001, 1.0 - ease), Math.max(0.001, 1.0 - ease));

      if (animProgress >= 1.0) {
        animating = false;
        eggGroup.scale.set(1, 1, 1);
        eggGroup.position.y = 0;
        noteGroup.scale.set(1, 1, 1);
        noteGroup.position.y = 0;
        runeGroup.visible = false;
      }
    }

    // 關公神像金光粒子升騰
    if (isRevealed) {
      const arr = auraGeo.attributes.position.array;
      for (let i = 0; i < auraCount; i++) {
        arr[i * 3 + 1] += delta * 1.15;
        arr[i * 3] += Math.sin(time * 2.5 + i) * 0.015;
        if (arr[i * 3 + 1] > 7.5) {
          arr[i * 3 + 1] = 0.5;
        }
      }
      auraGeo.attributes.position.needsUpdate = true;
      noteLight.intensity = 2.0 + Math.sin(time * 3.5) * 0.4;
    }
  });
}
