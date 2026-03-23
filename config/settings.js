require('dotenv').config();

module.exports = {
          API_KEY: process.env.BINANCE_API_KEY,
          API_SECRET: process.env.BINANCE_API_SECRET,
          BASE_URL: 'https://api.binance.com',

          SYMBOL: 'SOLUSDT',
          CAPITAL_USDT: parseFloat(process.env.CAPITAL_USDT) || 20,
          LEVERAGE: 1,
          MARGIN_TYPE: null,
          MAX_POSITION_PERCENT: 0.90,
          MAX_DAILY_TRADES: 50,
          MIN_VOLATILITY: 0.001,
          STOP_LOSS_PERCENT: 0.015,
          TAKE_PROFIT_PERCENT: 0.04,
          TRAILING_STOP: false,

          MA_FAST: 9,
          MA_SLOW: 21,
          MA_TREND: 200,
          RSI_PERIOD: 14,
          RSI_OVERBOUGHT: 75,
          RSI_OVERSOLD: 25,

          SCAN_SYMBOLS: [
                      'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT',
                      'NEARUSDT', 'LINKUSDT', 'DOTUSDT', 'LTCUSDT',
                      'BNBUSDT', 'TRXUSDT'
                    ],
          MIN_VOLUME_24H: 1000000,
          MIN_CHANGE_24H: 0.1,
          ANALYSIS_INTERVAL_MS: 30000,
          DRY_RUN: process.env.DRY_RUN !== 'false',
};
