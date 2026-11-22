// 使用 Web Audio API 實作程序化多媒體音效、和弦 BGM 與空間 3D 環境流水音景

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmGain = null;
    this.sfxGain = null;

    // 空間環境音（溫泉潺潺流水 + 五峰旗飛瀑轟鳴）
    this.springGain = null;
    this.waterfallGain = null;
    this.spatialStarted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.35;
      this.sfxGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.15;
      this.bgmGain.connect(this.ctx.destination);

      this.initSpatialAudioNodes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initSpatialAudioNodes() {
    if (this.spatialStarted || !this.ctx) return;
    this.spatialStarted = true;

    // 1. 溫泉水流聲（低通濾波白噪音）
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const springFilter = this.ctx.createBiquadFilter();
    springFilter.type = 'lowpass';
    springFilter.frequency.value = 650;

    this.springGain = this.ctx.createGain();
    this.springGain.gain.value = 0;

    whiteNoise.connect(springFilter);
    springFilter.connect(this.springGain);
    this.springGain.connect(this.ctx.destination);
    whiteNoise.start();

    // 2. 瀑布飛濺轟鳴聲（帶通帶重低音）
    const wfNoise = this.ctx.createBufferSource();
    wfNoise.buffer = noiseBuffer;
    wfNoise.loop = true;

    const wfFilter = this.ctx.createBiquadFilter();
    wfFilter.type = 'bandpass';
    wfFilter.frequency.value = 450;
    wfFilter.Q.value = 1.2;

    this.waterfallGain = this.ctx.createGain();
    this.waterfallGain.gain.value = 0;

    wfNoise.connect(wfFilter);
    wfFilter.connect(this.waterfallGain);
    this.waterfallGain.connect(this.ctx.destination);
    wfNoise.start();
  }

  // 空間音訊每幀更新（根據玩家與景點的距離動態調節音量）
  updateSpatialAudio(playerPos) {
    if (this.isMuted || !this.ctx || !this.springGain || !this.waterfallGain) return;

    // 湯圍溝位置 (-35, 0, -15)
    const distSpring = Math.hypot(playerPos.x - (-35), playerPos.z - (-15));
    const maxSpringDist = 38.0;
    const targetSpringVol = Math.max(0, 1 - distSpring / maxSpringDist) * 0.18;
    this.springGain.gain.setTargetAtTime(targetSpringVol, this.ctx.currentTime, 0.1);

    // 五峰旗瀑布位置 (0, 0, 54)
    const distWf = Math.hypot(playerPos.x - 0, playerPos.z - 54);
    const maxWfDist = 48.0;
    const targetWfVol = Math.max(0, 1 - distWf / maxWfDist) * 0.28;
    this.waterfallGain.gain.setTargetAtTime(targetWfVol, this.ctx.currentTime, 0.1);
  }

  playTone(freq, duration, type = 'sine', gainVal = 0.3) {
    if (this.isMuted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playFootstep() {
    if (this.isMuted) return;
    this.playTone(80 + Math.random() * 30, 0.08, 'triangle', 0.1);
  }

  playInteract() {
    this.playTone(523.25, 0.12, 'sine', 0.25);
  }

  playCorrect() {
    if (this.isMuted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sine', 0.3);
      }, idx * 90);
    });
  }

  playIncorrect() {
    if (this.isMuted) return;
    this.init();
    this.playTone(220, 0.15, 'sawtooth', 0.2);
    setTimeout(() => {
      this.playTone(180, 0.25, 'sawtooth', 0.2);
    }, 120);
  }

  playStamp() {
    if (this.isMuted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  playTreasure() {
    if (this.isMuted) return;
    this.init();
    const melody = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.4 },
      { f: 880.0, d: 0.2 },
      { f: 1046.5, d: 0.8 }
    ];
    let time = 0;
    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.f, note.d, 'triangle', 0.4);
      }, time * 1000);
      time += note.d * 0.9;
    });
  }

  // 趣味彩蛋鴨叫聲「呱呱～」
  playQuack() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    [0, 0.16].forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const startFreq = idx === 0 ? 320 : 380;
      const endFreq = idx === 0 ? 180 : 210;
      osc.frequency.setValueAtTime(startFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + 0.14);
      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.15);
    });
  }

  // 協天廟傳統擲筊木質碰撞清脆音效
  playWoodClack() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    [0, 0.055].forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = idx === 0 ? 540 : 470;
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(140, now + delay + 0.09);
      gain.gain.setValueAtTime(0.45, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.1);
    });
  }

  // 蔬果放入溫泉竹籃輕快水花聲
  playVeggiePop() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // 蔬果選錯彈回逗趣音效
  playVeggieFail() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  toggleBgm() {
    this.init();
    if (this.bgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  startBgm() {
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    const chords = [
      [261.63, 329.63, 392.0, 523.25],
      [220.0, 261.63, 329.63, 440.0],
      [174.61, 220.0, 261.63, 349.23],
      [196.0, 246.94, 293.66, 392.0]
    ];

    let chordIdx = 0;
    const playNextBar = () => {
      if (!this.bgmPlaying || this.isMuted) return;
      const notes = chords[chordIdx];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          if (!this.bgmPlaying || this.isMuted) return;
          this.playTone(freq, 0.6, 'sine', 0.12);
        }, i * 280);
      });
      chordIdx = (chordIdx + 1) % chords.length;
    };

    playNextBar();
    this.bgmTimer = setInterval(playNextBar, 2400);
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.bgmPlaying) this.stopBgm();
      if (this.springGain) this.springGain.gain.value = 0;
      if (this.waterfallGain) this.waterfallGain.gain.value = 0;
    }
    return this.isMuted;
  }
}

export const audio = new AudioManager();
