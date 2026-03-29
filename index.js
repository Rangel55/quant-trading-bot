require('dotenv').config();
const { validateConnection } = require('./services/connection.validator');
const { runTradingCycle } = require('./controllers/trading.controller');
const { ANALYSIS_INTERVAL_MS, DRY_RUN, SYMBOL, LEVERAGE } = require('./config/settings');

async function start() {
    console.log('');
    console.log('=========================================');
    console.log('   QUANT TRADING BOT - ByBit Futures  ');
    console.log('=========================================');
    console.log('Versao: 2.0.0');
    console.log('Modo:   ' + (DRY_RUN ? 'DRY RUN (simulacao)' : 'LIVE (REAL)'));
    console.log('Par:    ' + SYMBOL);
    console.log('Leverage: ' + LEVERAGE + 'x');
    console.log('=========================================');

  // Validacao de conexao e autenticacao ByBit antes de qualquer operacao
  try {
        await validateConnection();
  } catch (err) {
        console.error('SISTEMA ABORTADO: Falha na validacao ByBit.');
        console.error('Erro: ' + err.message);
        process.exit(1);
  }

  // Primeiro ciclo imediato apos validacao
  await runTradingCycle();

  // Ciclos periodicos automaticos
  console.log('Bot ativo. Proximo ciclo em ' + (ANALYSIS_INTERVAL_MS / 60000) + ' minuto(s)...');
    setInterval(async () => {
          try {
                  await runTradingCycle();
          } catch (err) {
                  console.error('ERRO no ciclo:', err.message);
          }
    }, ANALYSIS_INTERVAL_MS);
}

process.on('unhandledRejection', function(reason) {
    console.error('ERRO nao tratado:', reason);
});

process.on('uncaughtException', function(err) {
    console.error('EXCECAO:', err.message);
    process.exit(1);
});

process.on('SIGINT', function() {
    console.log('');
    console.log('Bot encerrado pelo usuario. Ate logo!');
    process.exit(0);
});

start();
