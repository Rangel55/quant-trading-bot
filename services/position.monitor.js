const { getPositions } = require('./order.service');
const { log } = require('../logs/trade.logger');

// Estado interno: rastreia posicao aberta entre ciclos
var trackedPosition = null;

// Registra uma nova posicao aberta para monitoramento
function trackPosition(symbol, side, qty, entryPrice, orderId, levels) {
  trackedPosition = {
    symbol,
    side,
    qty,
    entryPrice,
    orderId: orderId || null,
    stopLoss:   levels ? levels.stopLoss   : null,
    takeProfit: levels ? levels.takeProfit : null,
    openedAt: new Date().toISOString(),
  };
  console.log('[MONITOR] Rastreando posicao: ' + side + ' ' + qty + ' ' + symbol + ' @ ' + entryPrice);
}

// Limpa a posicao rastreada
function clearTracked() {
  trackedPosition = null;
}

// Retorna a posicao atualmente rastreada
function getTracked() {
  return trackedPosition;
}

// Verifica se a posicao rastreada ainda esta aberta na ByBit.
// Se fechou, calcula P&L e loga o resultado.
// Retorna true se ainda aberta, false se foi fechada.
async function checkAndLogIfClosed() {
  if (!trackedPosition) return false;

  try {
    var positions = await getPositions(trackedPosition.symbol);
    var open = positions.find(function(p) {
      return parseFloat(p.size) > 0 && p.side === (trackedPosition.side === 'LONG' ? 'Buy' : 'Sell');
    });

    if (open) {
      var unrealizedPnl = parseFloat(open.unrealisedPnl || 0);
      var markPrice     = parseFloat(open.markPrice || open.avgPrice || trackedPosition.entryPrice);
      console.log('[MONITOR] Posicao aberta | ' + trackedPosition.symbol +
        ' ' + trackedPosition.side +
        ' | UnrealPnL: $' + unrealizedPnl.toFixed(4) +
        ' | Mark: $' + markPrice);
      return true;
    }

    // Posicao foi fechada (SL/TP ou manual)
    var closedAt = new Date().toISOString();
    var durationMs = new Date(closedAt) - new Date(trackedPosition.openedAt);
    var durationMin = Math.round(durationMs / 60000);

    // Tenta recuperar P&L realizado pelo historico de trades
    var realizedPnl = null;
    try {
      var bybit = require('./bybit.service');
      var pnlData = await bybit.privateGet('/v5/position/closed-pnl', {
        category: 'linear',
        symbol:   trackedPosition.symbol,
        limit:    1
      });
      if (pnlData && pnlData.result && pnlData.result.list && pnlData.result.list.length > 0) {
        realizedPnl = parseFloat(pnlData.result.list[0].closedPnl || 0);
      }
    } catch (e) {
      console.warn('[MONITOR] Nao foi possivel buscar P&L realizado: ' + e.message);
    }

    var pnlStr = realizedPnl !== null ? '$' + realizedPnl.toFixed(4) : 'N/A';
    console.log('[MONITOR] Posicao FECHADA: ' + trackedPosition.symbol +
      ' ' + trackedPosition.side +
      ' | P&L: ' + pnlStr +
      ' | Duracao: ' + durationMin + 'min');

    log({
      symbol:       trackedPosition.symbol,
      decision:     'FECHAMENTO',
      side:         trackedPosition.side,
      qty:          trackedPosition.qty,
      entryPrice:   trackedPosition.entryPrice,
      openedAt:     trackedPosition.openedAt,
      closedAt:     closedAt,
      durationMin:  durationMin,
      realizedPnl:  realizedPnl,
      stopLoss:     trackedPosition.stopLoss,
      takeProfit:   trackedPosition.takeProfit,
      executed:     true,
      mode:         'CLOSE_DETECTED',
    });

    trackedPosition = null;
    return false;

  } catch (err) {
    console.warn('[MONITOR] Erro ao verificar posicao: ' + err.message);
    return true;
  }
}

module.exports = { trackPosition, clearTracked, getTracked, checkAndLogIfClosed };
