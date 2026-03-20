const fs   = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'trades.json');

// Registra operacao no arquivo JSON de logs
function log(entry) {
  var trades = [];
  if (fs.existsSync(LOG_FILE)) {
    try { trades = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')); }
    catch (e) { trades = []; }
  }
  entry.timestamp = new Date().toISOString();
  trades.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(trades, null, 2));
  console.log('Log: ' + entry.decision + ' @ ' + entry.price + ' [' + entry.timestamp + ']');
}

// Exibe analise formatada no console
function logAnalysis(a) {
  console.log('');
  console.log('==========================================');
  console.log('  ANALISE QUANTITATIVA - ' + new Date().toLocaleTimeString());
  console.log('==========================================');
  console.log('  Preco:        ' + a.price);
  console.log('  MA Rapida:    ' + (a.maFast   ? a.maFast.toFixed(2)   : 'N/A'));
  console.log('  MA Lenta:     ' + (a.maSlow   ? a.maSlow.toFixed(2)   : 'N/A'));
  console.log('  MA Tendencia: ' + (a.maTrend  ? a.maTrend.toFixed(2)  : 'N/A'));
  console.log('  RSI:          ' + (a.rsiVal   ? a.rsiVal.toFixed(2)   : 'N/A'));
  console.log('  ATR:          ' + (a.atrVal   ? a.atrVal.toFixed(2)   : 'N/A'));
  console.log('  Volatilidade: ' + (a.volatility * 100).toFixed(3) + '%');
  console.log('  Swing:        ' + a.swing);
  console.log('  Tendencia MA: ' + a.maTrendSignal);
  console.log('  Momentum:     ' + a.momentum);
  console.log('  Order Book:   ' + a.bookBias);
  console.log('  Sinais Bull:  ' + a.bullCount + '/4');
  console.log('  Sinais Bear:  ' + a.bearCount + '/4');
  console.log('==========================================');
  console.log('  DECISAO:      ' + a.decision);
  console.log('==========================================');
}

// Retorna historico de trades
function getHistory() {
  if (!fs.existsSync(LOG_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')); }
  catch (e) { return []; }
}

// Estatisticas basicas
function getStats() {
  var history = getHistory();
  var executed = history.filter(function(t) { return t.executed; });
  return {
    total:    history.length,
    executed: executed.length,
    dryRun:   history.filter(function(t) { return t.mode === 'DRY_RUN'; }).length,
    esperar:  history.filter(function(t) { return t.decision === 'ESPERAR'; }).length,
  };
}

module.exports = { log, logAnalysis, getHistory, getStats };
