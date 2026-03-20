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
            leverage: cfg.LEVERAGE,
              interval: null,
                currentSymbol: 'BTCUSDT',
                  lastAnalysis: null,
                    startedAt: null,
                    };

                    // GET /api/status - retorna estado atual do bot
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
                                                              stats: getStats(),
                                                                });
                                                                });

                                                                // POST /api/start - inicia o bot
                                                                app.post('/api/start', async function(req, res) {
                                                                  if (botState.running) {
                                                                      return res.json({ success: false, message: 'Bot ja esta rodando.' });
                                                                        }

                                                                          var body = req.body;
                                                                            if (body.capital) botState.capital = parseFloat(body.capital);
                                                                              if (body.stopLoss) botState.stopLossPercent = parseFloat(body.stopLoss);
                                                                                if (body.takeProfit) botState.takeProfitPercent = parseFloat(body.takeProfit);
                                                                                  if (body.leverage) botState.leverage = parseInt(body.leverage);
                                                                                    if (body.mode) botState.mode = body.mode;

                                                                                      // Atualiza config dinamicamente
                                                                                        cfg.CAPITAL_USDT = botState.capital;
                                                                                          cfg.STOP_LOSS_PERCENT = botState.stopLossPercent / 100;
                                                                                            cfg.TAKE_PROFIT_PERCENT = botState.takeProfitPercent / 100;
                                                                                              cfg.LEVERAGE = botState.leverage;
                                                                                                cfg.DRY_RUN = botState.mode !== 'LIVE';

                                                                                                  // Valida conexao antes de iniciar
                                                                                                    var validation = await runFullValidation(cfg.DRY_RUN);
                                                                                                      if (!validation.allPassed) {
                                                                                                          return res.json({ success: false, message: 'Falha na validacao de seguranca.' });
                                                                                                            }
                                                                                                            
                                                                                                              botState.running = true;
                                                                                                                botState.startedAt = new Date().toISOString();
                                                                                                                
                                                                                                                  // Primeiro ciclo imediato
                                                                                                                    runTradingCycle().catch(function(err) { console.error(err.message); });
                                                                                                                    
                                                                                                                      // Ciclos periodicos
                                                                                                                        botState.interval = setInterval(function() {
                                                                                                                            runTradingCycle().catch(function(err) { console.error(err.message); });
                                                                                                                              }, 30000);
                                                                                                                              
                                                                                                                                res.json({ success: true, message: 'Bot iniciado em modo ' + botState.mode });
                                                                                                                                });
                                                                                                                                
                                                                                                                                // POST /api/stop - para o bot
                                                                                                                                app.post('/api/stop', function(req, res) {
                                                                                                                                  if (!botState.running) {
                                                                                                                                      return res.json({ success: false, message: 'Bot nao esta rodando.' });
                                                                                                                                        }
                                                                                                                                          if (botState.interval) {
                                                                                                                                              clearInterval(botState.interval);
                                                                                                                                                  botState.interval = null;
                                                                                                                                                    }
                                                                                                                                                      botState.running = false;
                                                                                                                                                        botState.startedAt = null;
                                                                                                                                                          res.json({ success: true, message: 'Bot parado.' });
                                                                                                                                                          });
                                                                                                                                                          
                                                                                                                                                          // GET /api/history - historico de trades
                                                                                                                                                          app.get('/api/history', function(req, res) {
                                                                                                                                                            var history = getHistory();
                                                                                                                                                              // Retorna os ultimos 50 trades
                                                                                                                                                                res.json(history.slice(-50).reverse());
                                                                                                                                                                });
                                                                                                                                                                
                                                                                                                                                                // POST /api/settings - atualiza configuracoes sem reiniciar
                                                                                                                                                                app.post('/api/settings', function(req, res) {
                                                                                                                                                                  var body = req.body;
                                                                                                                                                                    if (body.capital) { botState.capital = parseFloat(body.capital); cfg.CAPITAL_USDT = botState.capital; }
                                                                                                                                                                      if (body.stopLoss) { botState.stopLossPercent = parseFloat(body.stopLoss); cfg.STOP_LOSS_PERCENT = botState.stopLossPercent / 100; }
                                                                                                                                                                        if (body.takeProfit) { botState.takeProfitPercent = parseFloat(body.takeProfit); cfg.TAKE_PROFIT_PERCENT = botState.takeProfitPercent / 100; }
                                                                                                                                                                          if (body.leverage) { botState.leverage = parseInt(body.leverage); cfg.LEVERAGE = botState.leverage; }
                                                                                                                                                                            res.json({ success: true, message: 'Configuracoes atualizadas.' });
                                                                                                                                                                            });
                                                                                                                                                                            
                                                                                                                                                                            const PORT = process.env.PORT || 3000;
                                                                                                                                                                            app.listen(PORT, function() {
                                                                                                                                                                              console.log('');
                                                                                                                                                                                console.log('=========================================');
                                                                                                                                                                                  console.log(' QUANT TRADING BOT - Dashboard');
                                                                                                                                                                                    console.log(' Acesse: http://localhost:' + PORT);
                                                                                                                                                                                      console.log('=========================================');
                                                                                                                                                                                      });
