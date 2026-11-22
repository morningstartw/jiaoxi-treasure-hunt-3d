import * as THREE from 'three';
import { audio } from './audio.js';
import { passport } from './passport.js';
import { TASKS_DATA, SCENES_DATA } from './culturalData.js';

export class PlayerController {
  constructor(scene, camera, domElement, colliders = []) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.colliders = colliders;

    // 玩家狀態
    this.position = new THREE.Vector3(0, 0, 3);
    this.rotationY = Math.PI;
    this.currentRotationY = Math.PI;
    this.walkSpeed = 9.5;
    this.runSpeed = 17.0;

    // 動畫狀態
    this.isMoving = false;
    this.animTime = 0;
    this.footstepTimer = 0;

    // 第三人稱相機參數（初始相機位於玩家身後，朝向任務板正面）
    this.cameraYaw = Math.PI; // 水平旋轉
    this.cameraPitch = 0.35; // 垂直俯仰角 (rad)
    this.cameraDistance = 8.5; // 目標縮放距離
    this.currentCameraDist = 8.5; // 當前平滑防遮擋距離
    this.minDistance = 3.5;
    this.maxDistance = 22.0;

    // 滑鼠交互
    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };

    // 輸入按鍵
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shift: false
    };

    this.createCharacterMesh();
    this.createGuideArrow();
    this.bindEvents();
    this.updateCamera(0.016);
  }

  createCharacterMesh() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // 身體/外套
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.9, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0984e3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    this.mesh.add(body);

    // 頭部
    const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffeaa7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    head.castShadow = true;
    this.mesh.add(head);

    // 旅人帽子
    const hatBrimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 12);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0xdfe6e9 });
    const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 1.62;
    this.mesh.add(hatBrim);

    const hatTopGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.25, 12);
    const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
    hatTop.position.y = 1.74;
    this.mesh.add(hatTop);

    // 雙肩背包
    const bagGeo = new THREE.BoxGeometry(0.4, 0.55, 0.28);
    const bagMat = new THREE.MeshLambertMaterial({ color: 0xd35400 });
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bag.position.set(0, 0.9, -0.3);
    this.mesh.add(bag);

    // 雙腿
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.6, 8);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2d3436 });

    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.18, 0.3, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.18, 0.3, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    // 雙手臂（具備跑步/行走自然前後擺動）
    const armGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.52, 8);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x0984e3 });
    const handMat = new THREE.MeshLambertMaterial({ color: 0xffeaa7 });

    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.46, 1.22, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, armMat);
    leftArmMesh.position.y = -0.22;
    leftArmMesh.castShadow = true;
    this.leftArmGroup.add(leftArmMesh);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), handMat);
    leftHand.position.y = -0.48;
    this.leftArmGroup.add(leftHand);
    this.mesh.add(this.leftArmGroup);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.46, 1.22, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, armMat);
    rightArmMesh.position.y = -0.22;
    rightArmMesh.castShadow = true;
    this.rightArmGroup.add(rightArmMesh);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), handMat);
    rightHand.position.y = -0.48;
    this.rightArmGroup.add(rightHand);
    this.mesh.add(this.rightArmGroup);

    this.scene.add(this.mesh);
  }

  // 3D 腳下動態導引指針
  createGuideArrow() {
    this.guideGroup = new THREE.Group();

    const arrowGeo = new THREE.ConeGeometry(0.35, 1.2, 3);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xffa502,
      wireframe: false,
      transparent: true,
      opacity: 0.85
    });
    this.arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    this.arrowMesh.position.set(0, 0.12, 1.4);

    const ringGeo = new THREE.RingGeometry(0.8, 0.95, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2ed573,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;

    this.guideGroup.add(ring);
    this.guideGroup.add(this.arrowMesh);
    this.scene.add(this.guideGroup);
  }

  updateGuideArrow(time) {
    if (!this.guideGroup) return;
    this.guideGroup.position.copy(this.position);

    let targetPos = new THREE.Vector3(0, 0, 0);
    const state = passport.getState();

    if (state.canOpenChest && !state.hasOpenedChest) {
      targetPos.set(4, 0, 0);
    } else {
      const nextTask = TASKS_DATA.find(t => !passport.isTaskCompleted(t.id));
      if (nextTask) {
        const sceneInfo = SCENES_DATA[nextTask.sceneId];
        if (sceneInfo) {
          targetPos.set(sceneInfo.position.x, 0, sceneInfo.position.z);
        }
      } else {
        targetPos.set(4, 0, 0);
      }
    }

    const dx = targetPos.x - this.position.x;
    const dz = targetPos.z - this.position.z;
    const angle = Math.atan2(dx, dz);

    this.guideGroup.rotation.y = angle;
    this.arrowMesh.position.z = 1.3 + Math.sin(time * 4) * 0.18;
    this.arrowMesh.material.color.setHex(state.canOpenChest ? 0xffd700 : 0xff9f43);
  }

  // 實體碰撞檢測核心函數（測試指定座標 (x, z) 半徑 r 是否撞擊任何實體）
  isColliding(x, z, r = 0.52) {
    // 邊界防禦（不可走出城鎮主地圖邊界）
    if (x < -92 || x > 92 || z < -92 || z > 92) return true;

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (c.type === 'box') {
        const closestX = Math.max(c.minX, Math.min(x, c.maxX));
        const closestZ = Math.max(c.minZ, Math.min(z, c.maxZ));
        const distSq = (x - closestX) ** 2 + (z - closestZ) ** 2;
        if (distSq < r ** 2) {
          return true; // 發生碰撞，阻擋！
        }
      } else if (c.type === 'circle') {
        const distSq = (x - c.x) ** 2 + (z - c.z) ** 2;
        if (distSq < (c.radius + r) ** 2) {
          return true; // 發生碰撞，阻擋！
        }
      }
    }
    return false;
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shift = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shift = false;
          break;
      }
    });

    window.addEventListener('blur', () => {
      this.clearKeys();
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.dragDist = 0;
        this.wasActuallyDragging = false;
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    this.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      if (this.dragDist > 6) {
        this.wasActuallyDragging = true;
        setTimeout(() => {
          this.wasActuallyDragging = false;
        }, 120);
      }
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMousePos.x;
      const dy = e.clientY - this.prevMousePos.y;
      this.dragDist += Math.hypot(dx, dy);
      this.prevMousePos = { x: e.clientX, y: e.clientY };

      this.cameraYaw -= dx * 0.006;
      this.cameraPitch = Math.max(0.12, Math.min(Math.PI / 2.3, this.cameraPitch + dy * 0.005));
    });

    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance + e.deltaY * 0.015));
    }, { passive: false });
  }

  clearKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.shift = false;
    this.isDragging = false;
    this.wasActuallyDragging = false;
  }

  update(delta, time = 0, isModalActive = false) {
    if (isModalActive) {
      this.isMoving = false;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (this.leftArmGroup) this.leftArmGroup.rotation.x = 0;
      if (this.rightArmGroup) this.rightArmGroup.rotation.x = 0;
      this.updateGuideArrow(time);
      this.updateCamera(delta);
      return;
    }

    const moveDir = new THREE.Vector3();
    const camForward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw)).normalize();
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys.forward) moveDir.add(camForward);
    if (this.keys.backward) moveDir.sub(camForward);
    if (this.keys.left) moveDir.sub(camRight);
    if (this.keys.right) moveDir.add(camRight);

    if (moveDir.lengthSq() > 0.001) {
      moveDir.normalize();
      this.isMoving = true;
      const speed = this.keys.shift ? this.runSpeed : this.walkSpeed;

      // 連續微步碰撞檢測（Continuous Sub-stepping Collision）：
      // 將每幀移動距離切分為小於 0.12m 的微步，徹底杜絕高速奔跑穿牆 (Tunneling)
      const totalDist = speed * delta;
      const subSteps = Math.max(1, Math.ceil(totalDist / 0.12));
      const stepDelta = delta / subSteps;
      const stepDeltaX = moveDir.x * speed * stepDelta;
      const stepDeltaZ = moveDir.z * speed * stepDelta;
      const playerRadius = 0.52;

      for (let s = 0; s < subSteps; s++) {
        const nextX = this.position.x + stepDeltaX;
        const nextZ = this.position.z + stepDeltaZ;

        // 優先嘗試全方向移動
        if (!this.isColliding(nextX, nextZ, playerRadius)) {
          this.position.x = nextX;
          this.position.z = nextZ;
        } else {
          // 若遇障礙物，執行分離軸平滑滑行（沿牆面滑動，不卡頓且不穿模）
          if (!this.isColliding(nextX, this.position.z, playerRadius)) {
            this.position.x = nextX;
          }
          if (!this.isColliding(this.position.x, nextZ, playerRadius)) {
            this.position.z = nextZ;
          }
        }
      }

      // 平滑轉向
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetAngle - this.currentRotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.currentRotationY += diff * Math.min(1.0, delta * 12.0);
      this.mesh.rotation.y = this.currentRotationY;

      // 擬真自然行走/奔跑擺動與步態起伏
      const animRate = this.keys.shift ? 16 : 10.5;
      this.animTime += delta * animRate;
      this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.58;
      this.rightLeg.rotation.x = -Math.sin(this.animTime) * 0.58;

      if (this.leftArmGroup && this.rightArmGroup) {
        this.leftArmGroup.rotation.x = -Math.sin(this.animTime) * 0.62;
        this.rightArmGroup.rotation.x = Math.sin(this.animTime) * 0.62;
      }

      // 行走時軀幹輕微起伏
      this.position.y = Math.abs(Math.sin(this.animTime * 2)) * 0.055;

      this.footstepTimer += delta;
      if (this.footstepTimer > (this.keys.shift ? 0.23 : 0.36)) {
        this.footstepTimer = 0;
        audio.playFootstep();
      }
    } else {
      this.isMoving = false;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (this.leftArmGroup) this.leftArmGroup.rotation.x = 0;
      if (this.rightArmGroup) this.rightArmGroup.rotation.x = 0;
      // 靜止時微弱呼吸律動
      this.position.y = Math.sin(time * 2.2) * 0.015;
    }

    this.position.y = 0;
    this.mesh.position.copy(this.position);
    this.updateGuideArrow(time);
    this.updateCamera(delta);
  }

  updateCamera(delta) {
    // 智慧相機視線光線投射檢測（Raycast Occlusion Prevention）：
    // 從玩家向相機發射射線，若視線被任何實體建築或岩壁遮擋，立即將相機拉近至障礙物前方，杜絕相機穿入建築內部或被遮擋
    const fullOffsetX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const fullOffsetZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    let safeRatio = 1.0;
    const samples = 25;
    for (let i = 2; i <= samples; i++) {
      const t = i / samples;
      const testX = this.position.x - fullOffsetX * t;
      const testZ = this.position.z - fullOffsetZ * t;
      if (this.isColliding(testX, testZ, 0.45)) {
        safeRatio = Math.max(0.18, (i - 2) / samples);
        break;
      }
    }

    const targetDist = this.cameraDistance * safeRatio;
    this.currentCameraDist = THREE.MathUtils.lerp(this.currentCameraDist, targetDist, 0.25);

    const offsetX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.currentCameraDist;
    const offsetY = Math.sin(this.cameraPitch) * this.currentCameraDist;
    const offsetZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.currentCameraDist;

    const targetCamPos = new THREE.Vector3(
      this.position.x - offsetX,
      this.position.y + 1.6 + offsetY,
      this.position.z - offsetZ
    );

    this.camera.position.lerp(targetCamPos, 0.25);
    this.camera.lookAt(this.position.x, this.position.y + 1.4, this.position.z);
  }

  resetToSpawn() {
    this.position.set(0, 0, 3);
    this.mesh.position.copy(this.position);
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.35;
    this.cameraDistance = 8.5;
    this.rotationY = Math.PI;
    this.currentRotationY = Math.PI;
    this.mesh.rotation.y = Math.PI;
    this.clearKeys();
  }
}
