const { getCandles, getTicker, getOrderBook, getFundingRate, scanBestSymbol } = require('../services/market.service');
const { analyze } = require('../ai/analysis.service');
const { finalValidation, calculatePositionSize, calculateLevels, registerTrade } = require('../risk/risk.manager');
const { getFuturesBalance, getOpenPositions, setupSymbol, openLong, openShort, placeStopLoss, placeTakeProfit } = require('../services/order.service');
const { log, logAnalysis } = require('../logs/trade.logger');
const cfg = require('../config/settings');

// Simbolo ativo atual (atualizado pelo scanner)
var currentSymbol = cfg.SYMBOL;

// CICLO PRINCIPAL DE TRADING FUTURES
async function runTradingCycle() {
    console.log('');
    console.log('[' + new Date().toISOString() + '] Iniciando ciclo futures...');

  // PASSO 1: Scanner - seleciona o melhor par disponivel
  try {
        currentSymbol = await scanBestSymbol();
  } catch (err) {
        console.log('Scanner falhou, usando ' + currentSymbol + ': ' + err.message);
  }

  // PASSO 2: Verifica posicoes abertas - nao abre nova se ja tem posicao
  var openPositions = [];
    if (!cfg.DRY_RUN) {
          try {
                  openPositions = await getOpenPositions(currentSymbol);
                  if (openPositions.length > 0) {
                            console.log('Posicao ja aberta em ' + currentSymbol + '. Aguardando fechamento...');
                            return;
                  }
          } catch (err) {
                  console.error('Erro ao verificar posicoes:', err.message);
          }
    }

  // PASSO 3: Coleta dados de mercado
  var data = await Promise.all([
        getCandles(currentSymbol, '15m', 210),
        getTicker(currentSymbol),
        getOrderBook(currentSymbol, 20),
        getFundingRate(currentSymbol),
      ]);
    var candles = data[0];
    var ticker = data[1];
    var orderBook = data[2];
    var funding = data[3];

  console.log('Funding Rate: ' + (funding.fundingRate * 100).toFixed(4) + '%');

  // PASSOS 4-6: Analise quantitativa
  var analysis = analyze(candles, orderBook);
    analysis.symbol = currentSymbol;
    logAnalysis(analysis);

  // PASSO 11: Validacao final
  var validation = finalValidation(analysis);
    if (!validation.approved) {
          console.log('BLOQUEADO: ' + validation.issues.join(' | '));
          log({ symbol: currentSymbol, decision: 'ESPERAR', price: analysis.price, reason: validation.issues, executed: false });
          console.log('');
          console.log('ESPERAR');
          return;
    }

  // PASSO 8: Calculo de posicao
  var capital = cfg.DRY_RUN ? cfg.CAPITAL_USDT : await getFuturesBalance();
    var qty = calculatePositionSize(capital, analysis.price, cfg.LEVERAGE);
    var side = analysis.decision === 'COMPRAR' ? 'BUY' : 'SELL';
    var levels = calculateLevels(analysis.price, side);

  console.log('Capital: $' + capital.toFixed(2) + ' | Alavancagem: ' + cfg.LEVERAGE + 'x | Qty: ' + qty + ' | Side: ' + side);
    console.log('Stop Loss: ' + levels.stopLoss.toFixed(4) + ' | Take Profit: ' + levels.takeProfit.toFixed(4));

  // PASSO 9: Execucao
  if (cfg.DRY_RUN) {
        console.log('[DRY RUN] Ordem simulada: ' + side + ' ' + qty + ' ' + currentSymbol + ' @ ' + analysis.price);
        log({ symbol: currentSymbol, decision: analysis.decision, side, qty, price: analysis.price, levels, executed: false, mode: 'DRY_RUN' });
        registerTrade();
        console.log('');
        console.log(analysis.decision);
        return;
  }

  // MODO LIVE - execucao real em futuros
  try {
        // Configura alavancagem e margem
      await setupSymbol(currentSymbol);

      // Abre posicao
      var order;
        if (side === 'BUY') {
                order = await openLong(currentSymbol, qty);
        } else {
                order = await openShort(currentSymbol, qty);
        }

      // Coloca stop-loss e take-profit automaticos
      await placeStopLoss(currentSymbol, side, qty, levels.stopLoss);
        await placeTakeProfit(currentSymbol, side, qty, levels.takeProfit);

      registerTrade();
        log({
                symbol: currentSymbol,
                decision: analysis.decision,
                side, qty,
                price: analysis.price,
                levels,
                leverage: cfg.LEVERAGE,
                orderId: order.orderId,
                executed: true,
                mode: 'LIVE_FUTURES',
        });

      console.log('');
        console.log(analysis.decision);
  } catch (err) {
        console.error('ERRO ao executar ordem futures:', err.response ? JSON.stringify(err.response.data) : err.message);
        log({ symbol: currentSymbol, decision: analysis.decision, error: err.message, executed: false, mode: 'LIVE_ERROR' });
        console.log('');
        console.log('ESPERAR');
  }
}

module.exports = { runTradingCycle };
