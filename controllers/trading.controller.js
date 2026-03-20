const { getCandles, getTicker, getOrderBook } = require('../services/market.service');
const { analyze }          = require('../ai/analysis.service');
const { finalValidation, calculatePositionSize, calculateLevels, registerTrade } = require('../risk/risk.manager');
const { getBalance, placeMarketOrder, placeStopOrder } = require('../services/order.service');
const { log, logAnalysis } = require('../logs/trade.logger');
const cfg = require('../config/settings');

// ORQUESTRADOR PRINCIPAL - executa um ciclo completo de analise e trading
async function runTradingCycle() {
  console.log('');
  console.log('[' + new Date().toISOString() + '] Iniciando ciclo de analise...');

  // PASSO 3: Coleta de dados de mercado
  var data = await Promise.all([
    getCandles('1h', 210),
    getTicker(),
    getOrderBook(20),
  ]);
  var candles   = data[0];
  var ticker    = data[1];
  var orderBook = data[2];

  // PASSOS 4-6: Analise quantitativa completa
  var analysis = analyze(candles, orderBook);
  logAnalysis(analysis);

  // PASSO 11: Validacao final obrigatoria
  var validation = finalValidation(analysis);
  if (!validation.approved) {
    console.log('BLOQUEADO. Motivos: ' + validation.issues.join(' | '));
    log({ decision: 'ESPERAR', price: analysis.price, reason: validation.issues, executed: false });

    // PASSO 12: Saida exclusiva
    console.log('');
    console.log('ESPERAR');
    return;
  }

  // PASSO 8: Calculo de posicao com gestao de risco
  var capital = await getBalance('USDT');
  var qty     = calculatePositionSize(capital, analysis.price);
  var side    = analysis.decision === 'COMPRAR' ? 'BUY' : 'SELL';
  var levels  = calculateLevels(analysis.price, side);

  console.log('Capital: $' + capital.toFixed(2) + ' | Qty: ' + qty + ' | Side: ' + side);
  console.log('Stop Loss: ' + levels.stopLoss.toFixed(2) + ' | Take Profit: ' + levels.takeProfit.toFixed(2));

  // PASSO 9: Execucao - DRY RUN ou LIVE
  if (cfg.DRY_RUN) {
    console.log('[DRY RUN] Ordem simulada: ' + side + ' ' + qty + ' @ ' + analysis.price);
    log({ decision: analysis.decision, side, qty, price: analysis.price, levels, executed: false, mode: 'DRY_RUN' });
    registerTrade();
    console.log('');
    console.log(analysis.decision);
    return;
  }

  // MODO LIVE - execucao real na Binance
  try {
    var order = await placeMarketOrder(side, qty);
    console.log('ORDEM EXECUTADA: #' + order.orderId);

    // Stop-loss automatico
    var stopSide = side === 'BUY' ? 'SELL' : 'BUY';
    await placeStopOrder(stopSide, qty, levels.stopLoss, levels.stopLoss * 0.999);

    registerTrade();
    log({
      decision:  analysis.decision,
      side,
      qty,
      price:     analysis.price,
      levels,
      orderId:   order.orderId,
      executed:  true,
      mode:      'LIVE',
    });

    // PASSO 12: Saida exclusiva
    console.log('');
    console.log(analysis.decision);

  } catch (err) {
    console.error('ERRO ao executar ordem:', err.response ? JSON.stringify(err.response.data) : err.message);
    log({ decision: analysis.decision, error: err.message, executed: false, mode: 'LIVE_ERROR' });
    console.log('');
    console.log('ESPERAR');
  }
}

module.exports = { runTradingCycle };
