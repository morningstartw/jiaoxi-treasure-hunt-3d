import * as THREE from 'three';
import { SCENES_DATA, TASKS_DATA } from './culturalData.js';
import { passport } from './passport.js';
import {
  createGrassTexture,
  createAsphaltTexture,
  createCrosswalkTexture,
  createCobblestoneTexture,
  createWoodDeckTexture
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

  // 散佈植被
  populateVegetation(scene);

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

// 註冊三大景點與中央廣場的實體障礙碰撞體
function registerWorldColliders(colliders) {
  // 1. 中央廣場任務佈告板
  colliders.push({ type: 'box', minX: -2.5, maxX: 2.5, minZ: -3.4, maxZ: -2.5 });

  // 2. 文化寶箱
  colliders.push({ type: 'box', minX: 3.2, maxX: 4.8, minZ: -0.6, maxZ: 0.6 });

  // 3. 協天廟大殿主體（阻擋穿入紅牆）
  colliders.push({ type: 'box', minX: 25.5, maxX: 44.5, minZ: -33.5, maxZ: -19.0 });
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

  // 4. 湯圍溝泡腳池（石砌凸出基台，阻擋踩入池中穿模）
  colliders.push({ type: 'box', minX: -40.2, maxX: -29.8, minZ: -18.4, maxZ: -11.6 });
  // 湯圍溝四根木柱
  colliders.push({ type: 'circle', x: -43.0, z: -21.0, radius: 0.35 });
  colliders.push({ type: 'circle', x: -27.0, z: -21.0, radius: 0.35 });
  colliders.push({ type: 'circle', x: -43.0, z: -9.0, radius: 0.35 });
  colliders.push({ type: 'circle', x: -27.0, z: -9.0, radius: 0.35 });

  // 5. 五峰旗後方巨型斷崖山岩（阻擋穿過岩壁掉進山體）
  colliders.push({ type: 'box', minX: -26.0, maxX: 26.0, minZ: 53.0, maxZ: 85.0 });
  // 五峰旗瀑布深潭
  colliders.push({ type: 'circle', x: 0, z: 54.0, radius: 8.6 });
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
  const deck = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 16), deckMat);
  deck.position.set(0, 0.2, 0);
  deck.receiveShadow = true;
  root.add(deck);

  const railMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  [-7.8, 7.8].forEach(rz => {
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.12, 0.12), railMat);
    railTop.position.set(0, 1.2, rz);
    root.add(railTop);

    for (let rx = -9; rx <= 9; rx += 3) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6), railMat);
      post.position.set(rx, 0.7, rz);
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

  createRing(-39, -15, '任務一：溫泉水質告示牌', 'task', 'task_spring');
  createSignBoardObject(scene, -39, 0, -15, '湯圍泉質告示牌');

  createRing(-31, -15, '任務二：溫泉農產蔬果籃', 'task', 'task_crops');
  createCropBasketObject(scene, -31, 0, -15);
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
  const templeBase = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 20), baseMat);
  templeBase.position.set(0, 0.6, 0);
  templeBase.receiveShadow = true;
  root.add(templeBase);

  const wallMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(17, 5.5, 13), wallMat);
  mainHall.position.set(0, 3.8, -1.5);
  mainHall.castShadow = true;
  root.add(mainHall);

  const roofMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
  const lowerRoof = new THREE.Mesh(new THREE.BoxGeometry(20, 1.3, 16), roofMat);
  lowerRoof.position.set(0, 6.7, -1.5);
  lowerRoof.castShadow = true;
  root.add(lowerRoof);

  const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(15, 1.5, 11), roofMat);
  upperRoof.position.set(0, 8.0, -1.5);
  upperRoof.castShadow = true;
  root.add(upperRoof);

  const colMat = new THREE.MeshLambertMaterial({ color: 0xd63031 });
  [-7, -2.5, 2.5, 7].forEach(cx => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 5.2, 16), colMat);
    pillar.position.set(cx, 3.8, 6.2);
    pillar.castShadow = true;
    root.add(pillar);
  });

  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.8, roughness: 0.4 });
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.3, 16), bronzeMat);
  burner.position.set(0, 1.8, 7.8);
  root.add(burner);

  const incenseGeo = new THREE.BufferGeometry();
  const incenseCount = 30;
  const incensePos = new Float32Array(incenseCount * 3);
  for (let i = 0; i < incenseCount; i++) {
    incensePos[i * 3] = (Math.random() - 0.5) * 0.4;
    incensePos[i * 3 + 1] = 2.4 + Math.random() * 2.5;
    incensePos[i * 3 + 2] = 7.8 + (Math.random() - 0.5) * 0.4;
  }
  incenseGeo.setAttribute('position', new THREE.BufferAttribute(incensePos, 3));
  const incenseMat = new THREE.PointsMaterial({ color: 0xdfe6e9, size: 0.28, transparent: true, opacity: 0.65 });
  const incense = new THREE.Points(incenseGeo, incenseMat);
  root.add(incense);

  createStoneLion(root, -5, 1.2, 8.5);
  createStoneLion(root, 5, 1.2, 8.5);
  createTemplePaifang(root, 0, 0, 13.5);

  animatedUpdaters.push((delta, time) => {
    const arr = incenseGeo.attributes.position.array;
    for (let i = 0; i < incenseCount; i++) {
      arr[i * 3 + 1] += delta * 0.85;
      arr[i * 3] += Math.sin(time * 3 + i) * 0.012;
      if (arr[i * 3 + 1] > 5.5) {
        arr[i * 3 + 1] = 2.4;
      }
    }
    incenseGeo.attributes.position.needsUpdate = true;
  });

  createPhotoDisplay(root, 'images/xietian_temple.jpg', 9, 2.6, 6, '協天廟實景照片');
  scene.add(root);

  createRing(30, -20, '任務三：協天廟文化展架', 'task', 'task_temple');
  createSignBoardObject(scene, 30, 0, -20, '蠶絲神像展架');

  createRing(40, -20, '任務四：春祭乞龜祝壽供桌', 'task', 'task_turtle');
  createTurtleAltarObject(scene, 40, 0, -20);
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

// 景點三：五峰旗風景特定區
function buildWufengqiFalls(scene, animatedUpdaters, createRing) {
  const root = new THREE.Group();
  root.position.set(0, 0, 54);

  const cliffMat = new THREE.MeshLambertMaterial({ color: 0x2d3436, roughness: 0.95 });
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(50, 30, 20), cliffMat);
  cliff.position.set(0, 15, 10);
  cliff.castShadow = true;
  root.add(cliff);

  const peakMat = new THREE.MeshLambertMaterial({ color: 0x145a32 });
  [-16, -8, 0, 8, 16].forEach((px, idx) => {
    const height = idx === 2 ? 42 : (idx === 1 || idx === 3 ? 36 : 30);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(7.0, height, 5), peakMat);
    peak.position.set(px, height / 2 + 10, 16);
    peak.castShadow = true;
    root.add(peak);
  });

  const fallMat1 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94 });
  const fallMat2 = new THREE.MeshBasicMaterial({ color: 0xe0f7fa, transparent: true, opacity: 0.88 });

  const fall1 = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 14), fallMat1);
  fall1.position.set(0, 20, 0.1);
  root.add(fall1);

  const fall2 = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 10), fallMat2);
  fall2.position.set(0, 9.5, 0.2);
  root.add(fall2);

  const pondMat = new THREE.MeshStandardMaterial({ color: 0x006266, roughness: 0.15, metalness: 0.2 });
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.4, 32), pondMat);
  pond.position.set(0, 0.2, 0);
  root.add(pond);

  const mistGeo = new THREE.BufferGeometry();
  const mistCount = 70;
  const mistPos = new Float32Array(mistCount * 3);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = (Math.random() - 0.5) * 8.5;
    mistPos[i * 3 + 1] = Math.random() * 5.5 + 0.3;
    mistPos[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.48, transparent: true, opacity: 0.65 });
  const mist = new THREE.Points(mistGeo, mistMat);
  root.add(mist);

  animatedUpdaters.push((delta, time) => {
    fall1.scale.x = 1.0 + Math.sin(time * 8) * 0.04;
    fall2.scale.x = 1.0 + Math.cos(time * 8) * 0.04;

    const arr = mistGeo.attributes.position.array;
    for (let i = 0; i < mistCount; i++) {
      arr[i * 3 + 1] += delta * 1.5;
      if (arr[i * 3 + 1] > 6.2) {
        arr[i * 3 + 1] = 0.3;
      }
    }
    mistGeo.attributes.position.needsUpdate = true;
  });

  createViewingPavilion(root, 0, 0.25, -9.5);
  createPhotoDisplay(root, 'images/wufengqi.jpg', -4, 2.0, -8.5, '五峰旗實景照片');
  scene.add(root);

  createRing(0, 44, '任務五：五峰飛瀑觀景明信片', 'task', 'task_waterfall');
  createSignBoardObject(scene, 0, 0, 44, '觀瀑明信片展台');
}

function createViewingPavilion(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const deckMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
  const viewingDeck = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 9), deckMat);
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

function populateVegetation(scene) {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
  const foliageMat1 = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  const foliageMat2 = new THREE.MeshLambertMaterial({ color: 0x388e3c });

  for (let i = 0; i < 75; i++) {
    const x = (Math.random() - 0.5) * 190;
    const z = (Math.random() - 0.5) * 190;

    if (Math.abs(x) < 14 && Math.abs(z) < 14) continue;
    if (Math.abs(z - (-5)) < 6.5 && Math.abs(x) < 55) continue;
    if (Math.abs(x) < 6.5 && z > 0 && z < 60) continue;
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

    const foliageHeight = 3.5 + Math.random() * 2;
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.8 + Math.random() * 0.6, foliageHeight, 6),
      Math.random() > 0.5 ? foliageMat1 : foliageMat2
    );
    foliage.position.y = 2.5 + foliageHeight / 2;
    foliage.castShadow = true;
    tree.add(foliage);

    scene.add(tree);
  }
}
