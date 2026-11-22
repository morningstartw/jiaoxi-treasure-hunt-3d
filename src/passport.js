import { TASKS_DATA, SCENES_DATA } from './culturalData.js';
import { audio } from './audio.js';

class PassportManager {
  constructor() {
    this.completedTasks = new Set();
    this.hasOpenedChest = false;
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.getState()));
  }

  isTaskCompleted(taskId) {
    return this.completedTasks.has(taskId);
  }

  completeTask(taskId) {
    if (this.completedTasks.has(taskId)) {
      return false; // 同一關只計一枚印章
    }
    this.completedTasks.add(taskId);
    audio.playStamp();
    this.notify();
    return true;
  }

  canOpenChest() {
    return this.completedTasks.size >= TASKS_DATA.length;
  }

  openChest() {
    if (!this.canOpenChest()) return false;
    this.hasOpenedChest = true;
    audio.playTreasure();
    this.notify();
    return true;
  }

  // 重新遊玩：進度回到 0/5
  reset() {
    this.completedTasks.clear();
    this.hasOpenedChest = false;
    this.notify();
  }

  getNextStepHint() {
    if (this.hasOpenedChest) {
      return '恭喜您已獲得「礁溪文化旅人」數位徽章！可隨時點擊「重新遊玩」再次挑戰。';
    }
    if (this.completedTasks.size === 5) {
      return '★ 恭喜集滿五枚印章！請返回中央廣場的「旅人任務板」，開啟文化寶箱領取數位徽章！';
    }

    // 尋找尚未完成的第一個任務
    const nextTask = TASKS_DATA.find(t => !this.completedTasks.has(t.id));
    if (nextTask) {
      const scene = SCENES_DATA[nextTask.sceneId];
      return `下一步提示：前往【${scene.name}】尋找【${nextTask.clueObject}】（${nextTask.title}）`;
    }
    return '前往各景點探索更多線索！';
  }

  getState() {
    const total = TASKS_DATA.length;
    const current = this.completedTasks.size;
    const stamps = TASKS_DATA.map(task => ({
      taskId: task.id,
      stampId: task.stampId,
      stampName: task.stampName,
      title: task.title,
      locationName: task.locationName,
      isCollected: this.completedTasks.has(task.id),
      stampSvg: `images/${task.stampId}.svg`
    }));

    return {
      current,
      total,
      progressText: `${current} / ${total}`,
      percent: (current / total) * 100,
      stamps,
      hasOpenedChest: this.hasOpenedChest,
      canOpenChest: this.canOpenChest(),
      nextHint: this.getNextStepHint()
    };
  }
}

export const passport = new PassportManager();
