const { getCandles, getTicker, getOrderBook, scanBestSymbol } = require('../services/market.service');
const { analyze } = require('../ai/analysis.service');
const { finalValidation, calculatePositionSize, calculateLevels, registerTrade } = require('../risk/risk.manager');
const { getSpotBalance, getAssetBalance, openBuy, openSell, placeStopLoss, placeTakeProfit, cancelAllOrders } = require('../services/order.service');
const { log, logAnalysis } = require('../logs/trade.logger');
const cfg = require('../config/settings');

// Simbolo ativo atual (atualizado pelo scanner)
var currentSymbol = cfg.SYMBOL;

// CICLO PRINCIPAL DE TRADING SPOT
async function runTradingCycle() {
  console.log('');
  console.log('[' + new Date().toISOString() + '] Iniciando ciclo Spot...');

  // PASSO 1: Scanner - seleciona o melhor par disponivel
  try {
    currentSymbol = await scanBestSymbol();
  } catch (err) {
    console.log('Scanner falhou, usando ' + currentSymbol + ': ' + err.message);
  }

  // PASSO 2: Coleta dados de mercado Spot
  var data = await Promise.all([
    getCandles(currentSymbol, '15m', 210),
    getTicker(currentSymbol),
    getOrderBook(currentSymbol, 20),
  ]);
  var candles = data[0];
  var ticker  = data[1];
  var orderBook = data[2];

  // PASSO 3: Analise quantitativa
  var analysis = analyze(candles, orderBook);
  analysis.symbol = currentSymbol;
  logAnalysis(analysis);

  // PASSO 4: Validacao final
  var validation = finalValidation(analysis);
  if (!validation.approved) {
    console.log('BLOQUEADO: ' + validation.issues.join(' | '));
    log({ symbol: currentSymbol, decision: 'ESPERAR', price: analysis.price, reason: validation.issues, executed: false });
    console.log('');
    console.log('ESPERAR');
    return;
  }

  // PASSO 5: Calculo de posicao (sem alavancagem no Spot)
  var capital = cfg.DRY_RUN ? cfg.CAPITAL_USDT : await getSpotBalance();
  var qty = calculatePositionSize(capital, analysis.price, 1); // leverage=1 no Spot
  var side = analysis.decision === 'COMPRAR' ? 'BUY' : 'SELL';
  var levels = calculateLevels(analysis.price, side);

  console.log('Capital: $' + capital.toFixed(2) + ' | Qty: ' + qty + ' | Side: ' + side);
  console.log('Stop Loss: ' + levels.stopLoss.toFixed(4) + ' | Take Profit: ' + levels.takeProfit.toFixed(4));

  // PASSO 6: Execucao
  if (cfg.DRY_RUN) {
    console.log('[DRY RUN] Ordem simulada: ' + side + ' ' + qty + ' ' + currentSymbol + ' @ ' + analysis.price);
    log({
      symbol: currentSymbol,
      decision: analysis.decision,
      side, qty,
      price: analysis.price,
      levels,
      executed: false,
      mode: 'DRY_RUN'
    });
    registerTrade();
    console.log('');
    console.log(analysis.decision);
    return;
  }

  // MODO LIVE - execucao real no Spot
  try {
    // No Spot, VENDER so e possivel se tiver o ativo em carteira
    if (side === 'SELL') {
      var baseAsset = currentSymbol.replace('USDT', '');
      var assetBalance = await getAssetBalance(baseAsset);
      if (assetBalance < qty) {
        console.log('Sem ' + baseAsset + ' suficiente para vender (' + assetBalance + '). Pulando...');
        log({ symbol: currentSymbol, decision: 'ESPERAR', price: analysis.price, reason: ['Sem ativo para vender'], executed: false, mode: 'LIVE' });
        return;
      }
    }

    // Abre a ordem
    var order;
    if (side === 'BUY') {
      order = await openBuy(currentSymbol, qty);
    } else {
      order = await openSell(currentSymbol, qty);
    }

    // Coloca stop-loss e take-profit
    await placeStopLoss(currentSymbol, side, qty, levels.stopLoss);
    await placeTakeProfit(currentSymbol, side, qty, levels.takeProfit);

    registerTrade();
    log({
      symbol: currentSymbol,
      decision: analysis.decision,
      side, qty,
      price: analysis.price,
      levels,
      orderId: order.orderId,
      executed: true,
      mode: 'LIVE_SPOT',
    });

    console.log('');
    console.log(analysis.decision);
  } catch (err) {
    console.error('ERRO ao executar ordem Spot:', err.response ? JSON.stringify(err.response.data) : err.message);
    log({ symbol: currentSymbol, decision: analysis.decision, error: err.message, executed: false, mode: 'LIVE_ERROR' });
    console.log('');
    console.log('ESPERAR');
  }
}

module.exports = { runTradingCycle };
