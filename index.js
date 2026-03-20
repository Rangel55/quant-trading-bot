require('dotenv').config();
const { runFullValidation }  = require('./services/connection.validator');
const { runTradingCycle }    = require('./controllers/trading.controller');
const { ANALYSIS_INTERVAL_MS, DRY_RUN, SYMBOL } = require('./config/settings');

async function start() {
  console.log('');
  console.log('=========================================');
  console.log('   QUANT TRADING BOT - Binance           ');
  console.log('=========================================');
  console.log('Versao: 1.0.0');
  console.log('Modo:   ' + (DRY_RUN ? 'DRY RUN (simulacao)' : 'LIVE (REAL)'));
  console.log('Par:    ' + SYMBOL);
  console.log('=========================================');

  // ETAPA 2: Validacao completa de seguranca antes de qualquer operacao
  var validation = await runFullValidation(DRY_RUN);
  if (!validation.allPassed) {
    console.error('SISTEMA ABORTADO: Falha na validacao de seguranca.');
    console.error('Consulte docs/SEGURANCA_API.md para instrucoes.');
    process.exit(1);
  }

  // Primeiro ciclo imediato apos validacao
  await runTradingCycle();

  // Ciclos periodicos automaticos
  console.log('Bot ativo. Proximo ciclo em ' + (ANALYSIS_INTERVAL_MS / 60000) + ' minuto(s)...');
  setInterval(async () => {
    try { await runTradingCycle(); }
    catch (err) { console.error('ERRO no ciclo:', err.message); }
  }, ANALYSIS_INTERVAL_MS);
}

process.on('unhandledRejection', function(reason) { console.error('ERRO:', reason); });
process.on('uncaughtException', function(err) { console.error('EXCECAO:', err.message); process.exit(1); });
process.on('SIGINT', function() { console.log('Bot encerrado. Ate logo!'); process.exit(0); });

start();
