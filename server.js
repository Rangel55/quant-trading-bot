require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { runFullValidation } = require('./services/connection.validator');
const { runTradingCycle } = require('./controllers/trading.controller');
const { getHistory, getStats } = require('./logs/trade.logger');
const cfg = require('./config/settings');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Estado do bot
var botState = {
  running: false,
  mode: 'DRY_RUN',
  capital: cfg.CAPITAL_USDT,
  stopLossPercent: cfg.STOP_LOSS_PERCENT * 100,
  takeProfitPercent: cfg.TAKE_PROFIT_PERCENT * 100,
  leverage: 1,
  interval: null,
  currentSymbol: cfg.SYMBOL,
  lastAnalysis: null,
  startedAt: null,
  balanceAtStart: 0
};

// Arquivo de sessoes do bot
var sessionsFile = path.join(__dirname, 'logs', 'sessions.json');
function loadSessions() {
  try {
    if (fs.existsSync(sessionsFile)) return JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
  } catch(e) {}
  return [];
}
function saveSessions(sessions) {
  try {
    var dir = path.join(__dirname, 'logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  } catch(e) {}
}

// Retorna saldo USDT da conta Spot
async function getSpotBalanceAPI() {
  try {
    var axios = require('axios');
    var crypto = require('crypto');
    var timestamp = Date.now();
    var query = 'timestamp=' + timestamp;
    var signature = crypto.createHmac('sha256', process.env.BINANCE_API_SECRET || '').update(query).digest('hex');
    var url = 'https://api.binance.com/api/v3/account?' + query + '&signature=' + signature;
    var res = await axios.get(url, {
      headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY || '' },
      timeout: 10000
    });
    var balances = res.data.balances || [];
    var usdt = balances.find(function(b) { return b.asset === 'USDT'; });
    return usdt ? parseFloat(usdt.free) : 0;
  } catch(e) {
    return 0;
  }
}

// GET /api/status
app.get('/api/status', function(req, res) {
  res.json({
    running: botState.running,
    mode: botState.mode,
    capital: botState.capital,
    stopLossPercent: botState.stopLossPercent,
    takeProfitPercent: botState.takeProfitPercent,
    leverage: botState.leverage,
    currentSymbol: botState.currentSymbol,
    lastAnalysis: botState.lastAnalysis,
    startedAt: botState.startedAt,
    stats: getStats()
  });
});

// GET /api/balance - saldo real da Binance Spot
app.get('/api/balance', async function(req, res) {
  try {
    var balance = await getSpotBalanceAPI();
    res.json({ balance, success: true });
  } catch(e) {
    res.json({ balance: 0, success: false, error: e.message });
  }
});

// GET /api/sessions
app.get('/api/sessions', function(req, res) {
  var sessions = loadSessions();
  res.json(sessions.slice(-20).reverse());
});

// POST /api/start
app.post('/api/start', async function(req, res) {
  if (botState.running) return res.json({ success: false, message: 'Bot ja esta rodando.' });

  var body = req.body;
  if (body.capital)    { botState.capital = parseFloat(body.capital); cfg.CAPITAL_USDT = botState.capital; }
  if (body.stopLoss)   { botState.stopLossPercent = parseFloat(body.stopLoss); cfg.STOP_LOSS_PERCENT = botState.stopLossPercent / 100; }
  if (body.takeProfit) { botState.takeProfitPercent = parseFloat(body.takeProfit); cfg.TAKE_PROFIT_PERCENT = botState.takeProfitPercent / 100; }
  if (body.mode)       { botState.mode = body.mode; }

  // Spot nao usa leverage
  botState.leverage = 1;
  cfg.LEVERAGE = 1;
  cfg.DRY_RUN = botState.mode !== 'LIVE';

  var validation = await runFullValidation(cfg.DRY_RUN);
  if (!validation.allPassed) return res.json({ success: false, message: 'Falha na validacao de seguranca.' });

  botState.balanceAtStart = await getSpotBalanceAPI();
  botState.running = true;
  botState.startedAt = new Date().toISOString();

  runTradingCycle().catch(function(err) { console.error(err.message); });
  botState.interval = setInterval(function() {
    runTradingCycle().catch(function(err) { console.error(err.message); });
  }, 30000);

  res.json({ success: true, message: 'Bot iniciado em modo ' + botState.mode });
});

// POST /api/stop
app.post('/api/stop', async function(req, res) {
  if (!botState.running) return res.json({ success: false, message: 'Bot nao esta rodando.' });

  if (botState.interval) { clearInterval(botState.interval); botState.interval = null; }

  var startedAt = botState.startedAt;
  var stoppedAt = new Date().toISOString();
  var durationMin = Math.round((new Date(stoppedAt) - new Date(startedAt)) / 60000);
  var balanceAtEnd = await getSpotBalanceAPI();
  var profit = balanceAtEnd - botState.balanceAtStart;
  var profitPercent = botState.balanceAtStart > 0 ? ((profit / botState.balanceAtStart) * 100) : 0;
  var stats = getStats();
  var sessions = loadSessions();

  sessions.push({
    id: sessions.length + 1,
    mode: botState.mode,
    capital: botState.capital,
    leverage: 1,
    stopLoss: botState.stopLossPercent,
    takeProfit: botState.takeProfitPercent,
    startedAt, stoppedAt, durationMin,
    balanceAtStart: botState.balanceAtStart,
    balanceAtEnd,
    profit: parseFloat(profit.toFixed(4)),
    profitPercent: parseFloat(profitPercent.toFixed(2)),
    totalCycles: stats.total,
    executed: stats.executed,
    esperar: stats.esperar
  });
  saveSessions(sessions);

  botState.running = false;
  botState.startedAt = null;
  res.json({ success: true, message: 'Bot parado.', session: sessions[sessions.length - 1] });
});

// GET /api/history
app.get('/api/history', function(req, res) {
  var history = getHistory();
  res.json(history.slice(-50).reverse());
});

// POST /api/settings
app.post('/api/settings', function(req, res) {
  var body = req.body;
  if (body.capital)    { botState.capital = parseFloat(body.capital); cfg.CAPITAL_USDT = botState.capital; }
  if (body.stopLoss)   { botState.stopLossPercent = parseFloat(body.stopLoss); cfg.STOP_LOSS_PERCENT = botState.stopLossPercent / 100; }
  if (body.takeProfit) { botState.takeProfitPercent = parseFloat(body.takeProfit); cfg.TAKE_PROFIT_PERCENT = botState.takeProfitPercent / 100; }
  res.json({ success: true, message: 'Configuracoes atualizadas.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('');
  console.log('========================================');
  console.log(' QUANT TRADING BOT - Dashboard');
  console.log(' Acesse: http://localhost:' + PORT);
  console.log('========================================');
  console.log('');
});
