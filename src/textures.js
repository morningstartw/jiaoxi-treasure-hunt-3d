import * as THREE from 'three';

// 產生高解析度無縫真實材質貼圖，100% 程式化向量繪製，零外部圖片相依、秒載入！

export function createGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 底色：深青綠
  ctx.fillStyle = '#4a7c29';
  ctx.fillRect(0, 0, 512, 512);

  // 繪製微細泥土雜質斑駁
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? '#3b6520' : '#598e32';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 繪製細密立體草絲（多重翠綠/墨綠/嫩綠色調）
  const grassBlades = [
    '#5c9e31', '#72b33e', '#417021', '#85cc4b', '#355919', '#66a836'
  ];
  for (let i = 0; i < 28000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = Math.random() * 7 + 4;
    const angle = (Math.random() - 0.5) * 1.2;
    ctx.strokeStyle = grassBlades[Math.floor(Math.random() * grassBlades.length)];
    ctx.lineWidth = Math.random() * 1.5 + 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}

export function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 深灰色瀝青底
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, 512, 512);

  // 細碎沙石顆粒
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 1.8 + 0.5;
    ctx.fillStyle = Math.random() > 0.5 ? '#1e272e' : (Math.random() > 0.5 ? '#3d4447' : '#57606f');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 道路中央黃色虛線
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 14;
  ctx.setLineDash([48, 36]);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  // 兩側白色實線邊線
  ctx.strokeStyle = '#ecf0f1';
  ctx.lineWidth = 8;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(28, 512);
  ctx.moveTo(484, 0);
  ctx.lineTo(484, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 10);
  return texture;
}

export function createCrosswalkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, 512, 256);

  // 斑馬線白色條紋
  ctx.fillStyle = '#ffffff';
  for (let x = 32; x < 512; x += 64) {
    ctx.fillRect(x, 24, 38, 208);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createCobblestoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3a3f44';
  ctx.fillRect(0, 0, 512, 512);

  // 石磚拼貼
  const brickW = 64;
  const brickH = 32;
  const colors = ['#636e72', '#57606f', '#747d8c', '#4b555e'];

  for (let y = 0; y < 512; y += brickH) {
    const shift = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
    for (let x = -brickW; x < 512 + brickW; x += brickW) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(x + shift + 2, y + 2, brickW - 4, brickH - 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function createWoodDeckTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(0, 0, 512, 512);

  // 木板長條拼接
  const plankH = 48;
  const woodShades = ['#8d5524', '#79441a', '#965b2a', '#6e3c15'];

  for (let y = 0; y < 512; y += plankH) {
    ctx.fillStyle = woodShades[Math.floor(Math.random() * woodShades.length)];
    ctx.fillRect(0, y + 2, 512, plankH - 4);

    // 木紋細紋
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const my = y + 6 + Math.random() * (plankH - 12);
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.bezierCurveTo(150, my + 4, 350, my - 4, 512, my + 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}
