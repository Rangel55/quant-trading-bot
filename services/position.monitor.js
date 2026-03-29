const fs  = require('fs');
const path = require('path');
const { getPositions } = require('./order.service');
const { log } = require('../logs/trade.logger');
const cfg = require('../config/settings');

// Arquivo de estado persistente - sobrevive a reinicializacoes do bot
var STATE_FILE = path.resolve(cfg.STATE_FILE || './logs/bot_state.json');

// Estado em memoria
var trackedPosition = null;

// Carrega estado do disco ao iniciar
function loadState() {
    try {
          if (fs.existsSync(STATE_FILE)) {
                  var data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
                  if (data && data.trackedPosition) {
                            trackedPosition = data.trackedPosition;
                            console.log('[MONITOR] Estado carregado do disco: ' +
                                                  trackedPosition.side + ' ' + trackedPosition.qty + ' ' +
                                                  trackedPosition.symbol + ' @ ' + trackedPosition.entryPrice +
                                                  ' (aberto em ' + trackedPosition.openedAt + ')');
                  }
          }
    } catch (e) {
          console.warn('[MONITOR] Nao foi possivel carregar estado: ' + e.message);
    }
}

// Persiste estado no disco
function saveState() {
    try {
          var dir = path.dirname(STATE_FILE);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(STATE_FILE, JSON.stringify({ trackedPosition }, null, 2));
    } catch (e) {
          console.warn('[MONITOR] Nao foi possivel salvar estado: ' + e.message);
    }
}

// Limpa estado do disco e memoria
function clearState() {
    trackedPosition = null;
    try {
          if (fs.existsSync(STATE_FILE)) fs.writeFileSync(STATE_FILE, JSON.stringify({ trackedPosition: null }, null, 2));
    } catch (e) {}
}

// Inicializa carregando estado persistido
loadState();

// Registra uma nova posicao aberta para monitoramento
function trackPosition(symbol, side, qty, entryPrice, orderId, levels) {
    trackedPosition = {
          symbol,
          side,
          qty,
          entryPrice,
          orderId:    orderId || null,
          stopLoss:   levels ? levels.stopLoss   : null,
          takeProfit: levels ? levels.takeProfit : null,
          openedAt:   new Date().toISOString(),
    };
    saveState();
    console.log('[MONITOR] Rastreando posicao: ' + side + ' ' + qty + ' ' + symbol + ' @ ' + entryPrice);
}

// Limpa a posicao rastreada
function clearTracked() {
    clearState();
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
      var closedAt   = new Date().toISOString();
        var durationMs  = new Date(closedAt) - new Date(trackedPosition.openedAt);
        var durationMin = Math.round(durationMs / 60000);

      // Tenta recuperar P&L realizado
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
              symbol:      trackedPosition.symbol,
              decision:    'FECHAMENTO',
              side:        trackedPosition.side,
              qty:         trackedPosition.qty,
              entryPrice:  trackedPosition.entryPrice,
              openedAt:    trackedPosition.openedAt,
              closedAt,
              durationMin,
              realizedPnl,
              stopLoss:    trackedPosition.stopLoss,
              takeProfit:  trackedPosition.takeProfit,
              executed:    true,
              mode:        'CLOSE_DETECTED',
      });

      clearState();
        return false;

  } catch (err) {
        console.warn('[MONITOR] Erro ao verificar posicao: ' + err.message);
        return true;
  }
}

module.exports = { trackPosition, clearTracked, getTracked, checkAndLogIfClosed };
