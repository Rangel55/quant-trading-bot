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
    console.log('Limite diario atingido.');
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
  var posicaoTotal = capital * cfg.MAX_POSITION_PERCENT * leverage;
  return Math.floor((posicaoTotal / price) * 1000) / 1000;
}

function calculateLevels(price, side) {
  if (side === 'BUY') {
    return {
      stopLoss: price * (1 - cfg.STOP_LOSS_PERCENT),
      takeProfit: price * (1 + cfg.TAKE_PROFIT_PERCENT)
    };
  }
  return {
    stopLoss: price * (1 + cfg.STOP_LOSS_PERCENT),
    takeProfit: price * (1 - cfg.TAKE_PROFIT_PERCENT)
  };
}

// CORRIGIDO: nao bloqueia por 'ESPERAR' - analysis.service.js nunca retorna ESPERAR
// Apenas bloqueia por RSI extremo ou limite diario atingido
function finalValidation(analysis) {
  var issues = [];

  if (analysis.rsiVal && analysis.rsiVal > 85) issues.push('RSI sobrecomprado (' + analysis.rsiVal.toFixed(1) + ')');
  if (analysis.rsiVal && analysis.rsiVal < 15) issues.push('RSI sobrevendido (' + analysis.rsiVal.toFixed(1) + ')');
  if (!canTrade()) issues.push('Limite diario atingido');
  if (!analysis.maFast || !analysis.maSlow) issues.push('Dados insuficientes');

  return {
    approved: issues.length === 0,
    issues: issues
  };
}

module.exports = { canTrade, registerTrade, calculatePositionSize, calculateLevels, finalValidation };
