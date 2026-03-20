const cfg = require('../config/settings');

var dailyTradeCount = 0;
var lastTradeDate = null;

function resetDailyCounter() {
    var today = new Date().toDateString();
    if (lastTradeDate !== today) {
          dailyTradeCount = 0;
          lastTradeDate = today;
    }
}

function canTrade() {
    resetDailyCounter();
    if (dailyTradeCount >= cfg.MAX_DAILY_TRADES) {
          console.log('Limite diario de ' + cfg.MAX_DAILY_TRADES + ' trades atingido.');
          return false;
    }
    return true;
}

function registerTrade() {
    resetDailyCounter();
    dailyTradeCount++;
    console.log('Trades hoje: ' + dailyTradeCount + '/' + cfg.MAX_DAILY_TRADES);
}

function calculatePositionSize(capital, price, leverage) {
    leverage = leverage || cfg.LEVERAGE || 1;
    var capitalUsado = capital * cfg.MAX_POSITION_PERCENT;
    var posicaoTotal = capitalUsado * leverage;
    var qty = posicaoTotal / price;
    return Math.floor(qty * 1000) / 1000;
}

function calculateLevels(price, side) {
    if (side === 'BUY') {
          return {
                  stopLoss: price * (1 - cfg.STOP_LOSS_PERCENT),
                  takeProfit: price * (1 + cfg.TAKE_PROFIT_PERCENT),
          };
    }
    return {
          stopLoss: price * (1 + cfg.STOP_LOSS_PERCENT),
          takeProfit: price * (1 - cfg.TAKE_PROFIT_PERCENT),
    };
}

function finalValidation(analysis) {
    var issues = [];
    if (!analysis.isVolatile) issues.push('Volatilidade insuficiente (<0.3%)');
    if (analysis.decision === 'ESPERAR') issues.push('Sinais insuficientes (< 3/4 confluentes)');
    if (analysis.rsiVal > 78) issues.push('RSI extremamente sobrecomprado (' + analysis.rsiVal.toFixed(1) + ')');
    if (analysis.rsiVal < 22) issues.push('RSI extremamente sobrevendido (' + analysis.rsiVal.toFixed(1) + ')');
    if (!canTrade()) issues.push('Limite diario de trades atingido');
    if (!analysis.maFast || !analysis.maSlow || !analysis.maTrend) issues.push('Dados insuficientes para analise');
    return { approved: issues.length === 0, issues: issues };
}

module.exports = { canTrade, registerTrade, calculatePositionSize, calculateLevels, finalValidation };
