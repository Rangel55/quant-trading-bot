require('dotenv').config();

module.exports = {
  // --- API Binance ---
  API_KEY:    process.env.BINANCE_API_KEY,
  API_SECRET: process.env.BINANCE_API_SECRET,
  BASE_URL:   'https://api.binance.com',

  // --- Par de trading ---
  SYMBOL: process.env.SYMBOL || 'BTCUSDT',

  // --- Capital disponivel ---
  CAPITAL_USDT: parseFloat(process.env.CAPITAL_USDT) || 100,

  // --- Gestao de risco ---
  MAX_POSITION_PERCENT: 0.02,   // max 2% do capital por trade
  MAX_DAILY_TRADES:     5,       // limite de operacoes diarias
  MIN_VOLATILITY:       0.003,   // volatilidade minima (0.3%)
  STOP_LOSS_PERCENT:    0.015,   // stop loss em 1.5%
  TAKE_PROFIT_PERCENT:  0.03,    // take profit em 3% (R:R = 1:2)

  // --- Parametros tecnicos ---
  MA_FAST:         9,
  MA_SLOW:         21,
  MA_TREND:        200,
  RSI_PERIOD:      14,
  RSI_OVERBOUGHT:  70,
  RSI_OVERSOLD:    30,

  // --- Intervalo de analise (em ms) ---
  ANALYSIS_INTERVAL_MS: 60000,   // 1 minuto

  // --- Modo de execucao ---
  DRY_RUN: process.env.DRY_RUN !== 'false',  // true por padrao (simulacao)
};
