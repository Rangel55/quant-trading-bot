const { getCandles, getTicker, getOrderBook, scanBestSymbol, normalizeQty } = require('../services/market.service');
const { analyze } = require('../ai/analysis.service');
const { finalValidation, calculatePositionSize, calculateLevels, registerTrade } = require('../risk/risk.manager');
const { getWalletBalance, openLong, openShort, cancelAllOrders, getPositions } = require('../services/order.service');
const { trackPosition, checkAndLogIfClosed, getTracked } = require('../services/position.monitor');
const { log, logAnalysis } = require('../logs/trade.logger');
const cfg = require('../config/settings');

// Simbolo ativo atual (atualizado pelo scanner)
var currentSymbol = cfg.SYMBOL;

// CICLO PRINCIPAL DE TRADING FUTUROS BYBIT
async function runTradingCycle() {
      console.log('');
      console.log('[' + new Date().toISOString() + '] Iniciando ciclo Futuros ByBit...');

  // PASSO 0 (LIVE): Verifica se posicao anterior ainda esta aberta e loga fechamento se ocorreu
  if (!cfg.DRY_RUN && getTracked()) {
          var stillOpen = await checkAndLogIfClosed();
          if (stillOpen) {
                    console.log('Posicao ainda aberta. Aguardando SL/TP...');
                    return;
          }
  }

  // PASSO 1: Scanner - seleciona o melhor par de futuros disponivel
  try {
          currentSymbol = await scanBestSymbol();
  } catch (err) {
          console.log('Scanner falhou, usando ' + currentSymbol + ': ' + err.message);
  }

  // PASSO 2: Coleta dados de mercado Futuros
  var data = await Promise.all([
          getCandles(currentSymbol, '15', 210),
          getTicker(currentSymbol),
          getOrderBook(currentSymbol, 20),
        ]);
      var candles   = data[0];
      var ticker    = data[1];
      var orderBook = data[2];

  // PASSO 3: Analise quantitativa
  var analysis = analyze(candles, orderBook);
      analysis.symbol = currentSymbol;
      analysis.openInterest = ticker.openInterest;
      logAnalysis(analysis);

  // PASSO 4: Validacao final
  var validation = finalValidation(analysis);
      if (!validation.approved) {
              console.log('BLOQUEADO: ' + validation.issues.join(' | '));
              log({ symbol: currentSymbol, decision: 'ESPERAR', price: analysis.price, reason: validation.issues, executed: false });
              console.log('ESPERAR');
              return;
      }

  // PASSO 5: Calculo de posicao com alavancagem + validacao de qty pelo par real
  var capital  = cfg.DRY_RUN ? cfg.CAPITAL_USDT : await getWalletBalance();
      var leverage = cfg.LEVERAGE || 10;
      var rawQty   = calculatePositionSize(capital, analysis.price, leverage);

  var qty = await normalizeQty(currentSymbol, rawQty, analysis.price);
      if (!qty) {
              var msg = 'Qty invalido para ' + currentSymbol + ' com capital $' + capital.toFixed(2) + ' e leverage ' + leverage + 'x';
              console.warn('BLOQUEADO: ' + msg);
              log({ symbol: currentSymbol, decision: 'ESPERAR', price: analysis.price, reason: [msg], executed: false });
              console.log('ESPERAR');
              return;
      }

  var side   = analysis.decision === 'COMPRAR' ? 'LONG' : 'SHORT';
      var levels = calculateLevels(analysis.price, side === 'LONG' ? 'BUY' : 'SELL');

  console.log('Capital: $' + capital.toFixed(2) + ' | Leverage: ' + leverage + 'x | Qty: ' + qty + ' | Side: ' + side);
      console.log('Stop Loss: ' + levels.stopLoss.toFixed(4) + ' | Take Profit: ' + levels.takeProfit.toFixed(4));

  // PASSO 6: Execucao
  if (cfg.DRY_RUN) {
          console.log('[DRY RUN] Ordem simulada: ' + side + ' ' + qty + ' ' + currentSymbol + ' @ ' + analysis.price);
          log({ symbol: currentSymbol, decision: analysis.decision, side, qty, price: analysis.price, leverage, levels, executed: false, mode: 'DRY_RUN' });
          registerTrade();
          console.log(analysis.decision);
          return;
  }

  // MODO LIVE - execucao real nos Futuros ByBit
  try {
          var positions = await getPositions(currentSymbol);
          var openPos = positions.find(function(p) { return parseFloat(p.size) > 0; });
          if (openPos) {
                    console.log('Posicao ja aberta em ' + currentSymbol + ' (' + openPos.side + ' ' + openPos.size + '). Pulando...');
                    return;
          }

        await cancelAllOrders(currentSymbol);

        var order;
          if (side === 'LONG') {
                    order = await openLong(currentSymbol, qty, analysis.price);
          } else {
                    order = await openShort(currentSymbol, qty, analysis.price);
          }

        var orderId = order && order.result && order.result.orderId;

        // Inicia rastreamento da posicao para detectar fechamento e calcular P&L
        trackPosition(currentSymbol, side, qty, analysis.price, orderId, levels);

        registerTrade();
          log({
                    symbol:   currentSymbol,
                    decision: analysis.decision,
                    side, qty,
                    price:    analysis.price,
                    leverage,
                    levels,
                    orderId,
                    executed: true,
                    mode:     'LIVE_FUTURES',
          });
          console.log(analysis.decision);

  } catch (err) {
          console.error('ERRO ao executar ordem Futuros:', err.response ? JSON.stringify(err.response.data) : err.message);
          log({ symbol: currentSymbol, decision: analysis.decision, error: err.message, executed: false, mode: 'LIVE_ERROR' });
          console.log('ESPERAR');
  }
}

module.exports = { runTradingCycle };
