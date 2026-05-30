import logger from '../utils/logger.js';

class BettingService {
  constructor() {
    this.bets = new Map();
    this.bettingOpen = false;
    this.gameStartTime = null;
    this.settlement = null;
  }

  openBetting(gameStartTime) {
    const isNewGame = this.gameStartTime !== gameStartTime;
    if (isNewGame) {
      this.bets.clear();
      this.settlement = null;
    }
    if (this.bettingOpen && !isNewGame) return;
    this.bettingOpen = true;
    this.gameStartTime = gameStartTime;
    this.settlement = null;
    logger.info('下注开放');
  }

  closeBetting() {
    this.bettingOpen = false;
    logger.info('下注关闭', { totalBets: this.bets.size });
  }

  placeBet(clientId, betType, prediction, amount) {
    if (!this.bettingOpen) {
      return { success: false, error: '下注已关闭' };
    }
    if (!['winner', 'top3'].includes(betType)) {
      return { success: false, error: '下注类型无效' };
    }
    if (!prediction || typeof prediction !== 'string') {
      return { success: false, error: '预测目标无效' };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: '下注金额无效' };
    }

    const betId = `bet_${Date.now()}_${clientId}`;
    this.bets.set(betId, { clientId, betType, prediction, amount, timestamp: Date.now() });

    logger.info('下注成功', { betId, clientId, betType, prediction });
    return { success: true, betId };
  }

  settleBets(winner, rankings) {
    if (this.settlement) {
      return this.settlement;
    }

    const top3Ids = rankings.slice(0, 3).map(entry => typeof entry === 'string' ? entry : entry.aiId || entry.id);
    const results = [];

    this.bets.forEach((bet, betId) => {
      let won = false;
      if (bet.betType === 'winner' && bet.prediction === winner) {
        won = true;
      } else if (bet.betType === 'top3' && top3Ids.includes(bet.prediction)) {
        won = true;
      }

      results.push({ betId, clientId: bet.clientId, won, amount: bet.amount });
    });

    logger.info('下注结算完成', { totalBets: results.length });
    this.settlement = results;
    return results;
  }

  getState() {
    return {
      bettingOpen: this.bettingOpen,
      totalBets: this.bets.size,
      gameStartTime: this.gameStartTime,
      settled: Boolean(this.settlement),
      settledBetCount: this.settlement?.length || 0
    };
  }
}

export default new BettingService();
