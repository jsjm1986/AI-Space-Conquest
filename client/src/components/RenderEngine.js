export class RenderEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.animations = [];
    this.fleetPositions = new Map();
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toScreen(worldX, worldY) {
    return {
      x: (worldX - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y: (worldY - this.camera.y) * this.camera.zoom + this.canvas.height / 2
    };
  }

  isVisible(worldX, worldY) {
    const margin = 100;
    const minX = this.camera.x - this.canvas.width / (2 * this.camera.zoom) - margin;
    const maxX = this.camera.x + this.canvas.width / (2 * this.camera.zoom) + margin;
    const minY = this.camera.y - this.canvas.height / (2 * this.camera.zoom) - margin;
    const maxY = this.camera.y + this.canvas.height / (2 * this.camera.zoom) + margin;
    return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
  }

  drawPlanet(planet) {
    if (!this.isVisible(planet.position.x, planet.position.y)) return;

    const pos = this.toScreen(planet.position.x, planet.position.y);
    const radius = planet.type === 'home' ? 12 : planet.type === 'resource' ? 10 : 8;

    this.ctx.fillStyle = planet.owner ? this.getAIColor(planet.owner) : '#666';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius * this.camera.zoom, 0, Math.PI * 2);
    this.ctx.fill();

    if (planet.owner) {
      this.ctx.strokeStyle = '#FFF';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  drawFleet(fleet) {
    const targetPos = { x: fleet.position.x, y: fleet.position.y };

    if (!this.fleetPositions.has(fleet.id)) {
      this.fleetPositions.set(fleet.id, { ...targetPos });
    }

    const currentPos = this.fleetPositions.get(fleet.id);
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      currentPos.x += dx * 0.1;
      currentPos.y += dy * 0.1;
    } else {
      currentPos.x = targetPos.x;
      currentPos.y = targetPos.y;
    }

    if (!this.isVisible(currentPos.x, currentPos.y)) return;

    const pos = this.toScreen(currentPos.x, currentPos.y);
    const size = 6 * this.camera.zoom;

    this.ctx.fillStyle = this.getAIColor(fleet.owner);
    this.ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);

    if (fleet.status === 'moving' && dist > 1) {
      this.ctx.strokeStyle = this.getAIColor(fleet.owner);
      this.ctx.setLineDash([5, 5]);
      const targetScreen = this.toScreen(targetPos.x, targetPos.y);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.ctx.lineTo(targetScreen.x, targetScreen.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  drawBattle(battle) {
    const pos = this.toScreen(battle.x, battle.y);
    const progress = (Date.now() - battle.startTime) / 2000;

    if (progress > 1) return false;

    const radius = 20 + progress * 30;
    this.ctx.strokeStyle = `rgba(255, 100, 0, ${1 - progress})`;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    return true;
  }

  addBattle(x, y) {
    this.animations.push({ type: 'battle', x, y, startTime: Date.now() });
  }

  updateAnimations() {
    this.animations = this.animations.filter(anim => {
      if (anim.type === 'battle') return this.drawBattle(anim);
      return false;
    });
  }

  getAIColor(aiId) {
    const colors = {
      ai_1: '#FF0000', ai_2: '#0000FF', ai_3: '#00FF00',
      ai_4: '#FF00FF', ai_5: '#FFFF00', ai_6: '#00FFFF', ai_7: '#FFA500'
    };
    return colors[aiId] || '#FFF';
  }

  setCamera(x, y, zoom) {
    this.camera = { x, y, zoom };
  }
}
