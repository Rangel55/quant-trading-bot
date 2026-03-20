const cfg = require('../config/settings');

// Controle de trades diarios
var dailyTradeCount = 0;
var lastTradeDate   = null;

function resetDailyCounter() {
  var today = new Date().toDateString();
  if (lastTradeDate !== today) {
    dailyTradeCount = 0;
    lastTradeDate = today;
  }
}

// Verifica se pode operar hoje
function canTrade() {
  resetDailyCounter();
  if (dailyTradeCount >= cfg.MAX_DAILY_TRADES) {
    console.log('Limite diario de ' + cfg.MAX_DAILY_TRADES + ' trades atingido. Aguardando amanha.');
    return false;
  }
  return true;
}

function registerTrade() {
  resetDailyCounter();
  dailyTradeCount++;
  console.log('Trades hoje: ' + dailyTradeCount + '/' + cfg.MAX_DAILY_TRADES);
}

// Calcula tamanho da posicao (2% do capital)
function calculatePositionSize(capital, price) {
  const maxCapital = capital * cfg.MAX_POSITION_PERCENT;
  const qty = maxCapital / price;
  return Math.floor(qty * 1e5) / 1e5;
}

// Calcula niveis de stop-loss e take-profit
function calculateLevels(price, side) {
  if (side === 'BUY') {
    return {
      stopLoss:   price * (1 - cfg.STOP_LOSS_PERCENT),
      takeProfit: price * (1 + cfg.TAKE_PROFIT_PERCENT),
    };
  }
  return {
    stopLoss:   price * (1 + cfg.STOP_LOSS_PERCENT),
    takeProfit: price * (1 - cfg.TAKE_PROFIT_PERCENT),
  };
}

// VALIDACAO FINAL antes de qualquer execucao (Passo 11)
function finalValidation(analysis) {
  var issues = [];
  if (!analysis.isVolatile)            issues.push('Volatilidade insuficiente (<0.3%)');
  if (analysis.decision === 'ESPERAR') issues.push('Nenhum sinal claro (< 3/4 confluentes)');
  if (analysis.rsiVal > 75)            issues.push('RSI extremamente sobrecomprado (' + analysis.rsiVal.toFixed(1) + ')');
  if (analysis.rsiVal < 25)            issues.push('RSI extremamente sobrevendido (' + analysis.rsiVal.toFixed(1) + ')');
  if (!canTrade())                      issues.push('Limite diario de trades atingido');
  if (!analysis.maFast || !analysis.maSlow || !analysis.maTrend) issues.push('Dados insuficientes para analise');

  return {
    approved: issues.length === 0,
    issues: issues,
  };
}

module.exports = { canTrade, registerTrade, calculatePositionSize, calculateLevels, finalValidation };
