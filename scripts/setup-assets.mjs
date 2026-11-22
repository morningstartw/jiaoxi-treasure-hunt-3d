import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/images');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 清單與對應的 Wikimedia 原始檔
const filesToFetch = [
  {
    target: 'tangweigou.jpg',
    title: 'File:湯圍溝景觀池.jpg',
    defaultDesc: '礁溪湯圍溝溫泉公園景觀池與木棧道',
    author: 'Yu tptw',
    license: 'CC BY-SA 4.0',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/%E6%B9%AF%E5%9C%8D%E6%BA%9D%E6%99%AF%E8%A7%80%E6%B1%A0.jpg/800px-%E6%B9%AF%E5%9C%8D%E6%BA%9D%E6%99%AF%E8%A7%80%E6%B1%A0.jpg'
  },
  {
    target: 'xietian_temple.jpg',
    title: 'File:Jiaoxi Xietian Temple 20240604.jpg',
    defaultDesc: '宜蘭礁溪協天廟主殿全貌與中式飛簷',
    author: 'Sheng-Hung Lin',
    license: 'CC BY-SA 4.0',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Jiaoxi_Xietian_Temple_20240604.jpg/800px-Jiaoxi_Xietian_Temple_20240604.jpg'
  },
  {
    target: 'wufengqi.jpg',
    title: 'File:Yilan Wufengqi Waterfall-宜蘭-五峰旗瀑布.jpg',
    defaultDesc: '宜蘭礁溪五峰旗瀑布飛瀑景觀',
    author: 'Sheng-Hung Lin',
    license: 'CC BY-SA 4.0',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Yilan_Wufengqi_Waterfall-%E5%AE%9C%E8%98%AD-%E4%BA%94%E5%B3%B0%E6%97%97%E7%80%91%E5%B8%83.jpg/600px-Yilan_Wufengqi_Waterfall-%E5%AE%9C%E8%98%AD-%E4%BA%94%E5%B3%B0%E6%97%97%E7%80%91%E5%B8%83.jpg'
  },
  {
    target: 'crops.jpg',
    title: 'File:Arya-kangkung-ipomoea aquatica-Pilangsari 2019 01.jpg',
    defaultDesc: '溫泉栽培水蕹菜（空心菜）與溫泉番茄',
    author: 'Arya kangkung',
    license: 'CC BY-SA 4.0',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Arya-kangkung-ipomoea_aquatica-Pilangsari_2019_01.jpg/800px-Arya-kangkung-ipomoea_aquatica-Pilangsari_2019_01.jpg'
  },
  {
    target: 'turtle.jpg',
    title: 'File:2025龍門觀音宮元宵乞龜-02.jpg',
    defaultDesc: '傳統民俗乞龜慶典之平安壽龜',
    author: 'Bo-Chen Chen',
    license: 'CC BY-SA 4.0',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/2025%E9%BE%8D%E9%96%80%E8%A7%80%E9%9F%B3%E5%AE%AE%E5%85%83%E5%AE%B5%E4%B9%9E%E9%BE%9C-02.jpg/800px-2025%E9%BE%8D%E9%96%80%E8%A7%80%E9%9F%B3%E5%AE%AE%E5%85%83%E5%AE%B5%E4%B9%9E%E9%BE%9C-02.jpg'
  }
];

const sourcesManifest = [];

async function downloadFile(item) {
  const filePath = path.join(outDir, item.target);
  console.log(`[素材下載] 正在處理: ${item.target} (${item.title})...`);

  let imageUrl = item.fallbackUrl;
  try {
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(item.title)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
    const res = await fetch(apiUrl, { headers: { 'User-Agent': 'JiaoxiCultureGame/1.0 (edu@project.org)' } });
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages || {};
      for (const p of Object.values(pages)) {
        if (p.imageinfo?.[0]?.thumburl) {
          imageUrl = p.imageinfo[0].thumburl;
        } else if (p.imageinfo?.[0]?.url) {
          imageUrl = p.imageinfo[0].url;
        }
      }
    }
  } catch (e) {
    console.warn(`查詢 API 失敗，使用 fallback: ${e.message}`);
  }

  try {
    const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (imgRes.ok) {
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`✓ 成功儲存: ${item.target} (${buffer.length} bytes)`);
    } else {
      throw new Error(`HTTP ${imgRes.status}`);
    }
  } catch (err) {
    console.error(`下載 ${item.target} 失敗: ${err.message}，建立高質感備援 SVG`);
    // 建立純 SVG 繪製備援
    createFallbackImage(filePath, item.defaultDesc);
  }

  sourcesManifest.push({
    file: `images/${item.target}`,
    title: item.title,
    description: item.defaultDesc,
    author: item.author,
    license: item.license,
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title)}`
  });
}

function createFallbackImage(filePath, desc) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2c5364;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#203a43;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0f2027;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#grad)" rx="16"/>
    <circle cx="400" cy="210" r="80" fill="#ffffff" opacity="0.1"/>
    <text x="400" y="220" font-family="sans-serif" font-size="28" fill="#48dbfb" text-anchor="middle" font-weight="bold">礁溪實景文化紀錄</text>
    <text x="400" y="270" font-family="sans-serif" font-size="20" fill="#ecf0f1" text-anchor="middle">${desc}</text>
    <rect x="250" y="330" width="300" height="40" rx="20" fill="#1dd1a1" opacity="0.8"/>
    <text x="400" y="356" font-family="sans-serif" font-size="16" fill="#ffffff" text-anchor="middle" font-weight="bold">宜蘭縣文化觀光歷史考證</text>
  </svg>`;
  fs.writeFileSync(filePath.replace('.jpg', '.svg'), svg, 'utf-8');
}

// 產生印章與徽章 SVG
function generateBadgesAndStamps() {
  const stamps = [
    { id: 'stamp1', name: '湯圍暖足印', color: '#e74c3c', text: '湯圍足湯', icon: '♨️' },
    { id: 'stamp2', name: '溫泉蔬果印', color: '#27ae60', text: '物產豐饒', icon: '🥬' },
    { id: 'stamp3', name: '協天帝君印', color: '#d35400', text: '忠義千秋', icon: '🏯' },
    { id: 'stamp4', name: '春祭平安印', color: '#8e44ad', text: '元宵乞龜', icon: '🐢' },
    { id: 'stamp5', name: '五峰飛瀑印', color: '#2980b9', text: '峰嶺飛瀑', icon: '🌊' }
  ];

  stamps.forEach(s => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <circle cx="100" cy="100" r="90" fill="none" stroke="${s.color}" stroke-width="6" stroke-dasharray="14 6" opacity="0.85" filter="url(#rough)"/>
      <circle cx="100" cy="100" r="76" fill="none" stroke="${s.color}" stroke-width="2.5" opacity="0.9"/>
      <circle cx="100" cy="100" r="70" fill="${s.color}" fill-opacity="0.08"/>
      <text x="100" y="65" font-family="serif" font-size="20" fill="${s.color}" text-anchor="middle" font-weight="bold" letter-spacing="4">礁溪文化印</text>
      <text x="100" y="112" font-size="38" text-anchor="middle">${s.icon}</text>
      <text x="100" y="152" font-family="serif" font-size="22" fill="${s.color}" text-anchor="middle" font-weight="bold" letter-spacing="5">${s.text}</text>
    </svg>`;
    fs.writeFileSync(path.join(outDir, `${s.id}.svg`), svg, 'utf-8');
  });

  // 數位徽章
  const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ffe259;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#ffa751;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#d4af37;stop-opacity:1" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:#ffa751;stop-opacity:0" />
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>
    <circle cx="150" cy="150" r="140" fill="url(#glow)"/>
    <polygon points="150,15 185,90 265,95 205,150 225,230 150,190 75,230 95,150 35,95 115,90" fill="url(#gold)" filter="url(#shadow)"/>
    <circle cx="150" cy="150" r="75" fill="#2c3e50" stroke="#ffd700" stroke-width="4"/>
    <circle cx="150" cy="150" r="68" fill="#1a252f"/>
    <text x="150" y="125" font-family="'Noto Serif TC', serif" font-size="14" fill="#ffd700" text-anchor="middle" letter-spacing="3">宜蘭礁溪</text>
    <text x="150" y="156" font-family="'Noto Serif TC', serif" font-size="20" fill="#ffffff" text-anchor="middle" font-weight="bold">文化旅人</text>
    <text x="150" y="180" font-family="sans-serif" font-size="12" fill="#48dbfb" text-anchor="middle" font-weight="bold">★ 尋寶大師 ★</text>
    <text x="150" y="200" font-family="sans-serif" font-size="10" fill="#bdc3c7" text-anchor="middle">CHIAO-HSI MASTER</text>
  </svg>`;
  fs.writeFileSync(path.join(outDir, 'badge.svg'), badgeSvg, 'utf-8');
  console.log('✓ 成功產生印章與數位徽章向量素材！');
}

async function main() {
  for (const item of filesToFetch) {
    await downloadFile(item);
  }
  generateBadgesAndStamps();
  fs.writeFileSync(path.resolve('public/sources.json'), JSON.stringify(sourcesManifest, null, 2), 'utf-8');
  console.log('✓ 素材清單已儲存至 public/sources.json');
}

main();
