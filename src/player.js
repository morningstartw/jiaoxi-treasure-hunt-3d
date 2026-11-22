import * as THREE from 'three';
import { audio } from './audio.js';
import { passport } from './passport.js';
import { TASKS_DATA, SCENES_DATA } from './culturalData.js';

export class PlayerController {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

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
    this.cameraDistance = 8.5; // 縮放距離
    this.minDistance = 4.0;
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

    // 身體/上衣（藍色旅人防風外套）
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

    // 旅人探險帽
    const hatBrimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 12);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0xdfe6e9 });
    const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 1.62;
    this.mesh.add(hatBrim);

    const hatTopGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.25, 12);
    const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
    hatTop.position.y = 1.74;
    this.mesh.add(hatTop);

    // 雙肩後背包
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

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      // 避免在彈窗輸入或開啟時被劫持
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

    // 視窗失去焦點時清空按鍵，防止卡住自動行走
    window.addEventListener('blur', () => {
      this.clearKeys();
    });

    // 滑鼠左鍵 (button 0) 或右鍵 (button 2) 拖曳旋轉視角
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    this.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMousePos.x;
      const dy = e.clientY - this.prevMousePos.y;
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
  }

  update(delta, time = 0, isModalActive = false) {
    // 若當前有彈窗（問答/護照/寶箱）開啟，鎖定移動與行走音效
    if (isModalActive) {
      this.isMoving = false;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.updateGuideArrow(time);
      this.updateCamera(delta);
      return;
    }

    const moveDir = new THREE.Vector3();
    const camForward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw)).normalize();
    // 使用精確的三維叉積 (Forward x Up) 取得真正的右側向量
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    // 嚴格保證：W 前進、S 後退、A 往左、D 往右
    if (this.keys.forward) moveDir.add(camForward);
    if (this.keys.backward) moveDir.sub(camForward);
    if (this.keys.left) moveDir.sub(camRight);
    if (this.keys.right) moveDir.add(camRight);

    if (moveDir.lengthSq() > 0.001) {
      moveDir.normalize();
      this.isMoving = true;
      const speed = this.keys.shift ? this.runSpeed : this.walkSpeed;
      this.position.addScaledVector(moveDir, speed * delta);

      // 平滑旋轉至移動方向
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetAngle - this.currentRotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.currentRotationY += diff * Math.min(1.0, delta * 12.0);
      this.mesh.rotation.y = this.currentRotationY;

      // 行走動畫
      this.animTime += delta * (this.keys.shift ? 16 : 10);
      this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.55;
      this.rightLeg.rotation.x = -Math.sin(this.animTime) * 0.55;

      this.footstepTimer += delta;
      if (this.footstepTimer > (this.keys.shift ? 0.24 : 0.38)) {
        this.footstepTimer = 0;
        audio.playFootstep();
      }
    } else {
      this.isMoving = false;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    // 邊界限制
    this.position.x = Math.max(-95, Math.min(95, this.position.x));
    this.position.z = Math.max(-95, Math.min(95, this.position.z));
    this.position.y = 0; // 平整地面，穩定貼地

    this.mesh.position.copy(this.position);
    this.updateGuideArrow(time);
    this.updateCamera(delta);
  }

  updateCamera(delta) {
    const offsetX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const offsetY = Math.sin(this.cameraPitch) * this.cameraDistance;
    const offsetZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    const targetCamPos = new THREE.Vector3(
      this.position.x - offsetX,
      this.position.y + 1.6 + offsetY,
      this.position.z - offsetZ
    );

    this.camera.position.lerp(targetCamPos, 0.15);
    this.camera.lookAt(this.position.x, this.position.y + 1.5, this.position.z);
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
