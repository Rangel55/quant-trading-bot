require('dotenv').config();
const { validateConnection } = require('./services/binance.service');
const { runTradingCycle }    = require('./controllers/trading.controller');
const { ANALYSIS_INTERVAL_MS } = require('./config/settings');

async function start() {
  console.log('=========================================');
  console.log('   QUANT TRADING BOT - Binance           ');
  console.log('=========================================');
  console.log('Modo: ' + (process.env.DRY_RUN === 'false' ? 'LIVE (REAL)' : 'DRY RUN (simulacao)'));
  console.log('Par: ' + (process.env.SYMBOL || 'BTCUSDT'));
  console.log('=========================================');

  const connected = await validateConnection();
  if (!connected) {
    console.error('ERRO FATAL: Sem conexao com Binance. Abortando.');
    process.exit(1);
  }

  await runTradingCycle();

  setInterval(async () => {
    try { await runTradingCycle(); }
    catch (err) { console.error('ERRO no ciclo:', err.message); }
  }, ANALYSIS_INTERVAL_MS);
}

process.on('unhandledRejection', (reason) => { console.error('Erro:', reason); });
process.on('uncaughtException', (err) => { console.error('Excecao:', err.message); process.exit(1); });

start();
