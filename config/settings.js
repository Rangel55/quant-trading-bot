require('dotenv').config();

module.exports = {
    // ByBit API
    BYBIT_API_KEY:    process.env.BYBIT_API_KEY,
    BYBIT_API_SECRET: process.env.BYBIT_API_SECRET,
    BYBIT_BASE_URL:   'https://api.bybit.com',

    // Par padrao (Futuros USDT-Perp)
    SYMBOL: process.env.SYMBOL || 'BTCUSDT',

    // Capital e alavancagem
    CAPITAL_USDT: parseFloat(process.env.CAPITAL_USDT) || 20,
    LEVERAGE:     parseInt(process.env.LEVERAGE)        || 10,
    MARGIN_TYPE:  process.env.MARGIN_TYPE               || 'ISOLATED', // ISOLATED ou CROSS

    // Gestao de posicao
    MAX_POSITION_PERCENT: parseFloat(process.env.MAX_POSITION_PERCENT) || 0.90,
    MAX_DAILY_TRADES:     parseInt(process.env.MAX_DAILY_TRADES)       || 50,

    // Filtros de entrada
    MIN_VOLATILITY: parseFloat(process.env.MIN_VOLATILITY) || 0.001,
    MIN_VOLUME_24H: parseFloat(process.env.MIN_VOLUME_24H) || 5000000,
    MIN_CHANGE_24H: parseFloat(process.env.MIN_CHANGE_24H) || 0.1,

    // Stop Loss e Take Profit (em %)
    STOP_LOSS_PERCENT:   parseFloat(process.env.STOP_LOSS_PERCENT)   || 0.015,
    TAKE_PROFIT_PERCENT: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 0.04,

    // Trailing Stop
    // TRAILING_STOP=true ativa o trailing (substitui o SL fixo)
    // TRAILING_STOP_PERCENT define a distancia do trailing em % do preco de entrada
    TRAILING_STOP:         process.env.TRAILING_STOP === 'true',
    TRAILING_STOP_PERCENT: parseFloat(process.env.TRAILING_STOP_PERCENT) || 0.01,

    // Indicadores tecnicos
    MA_FAST:       parseInt(process.env.MA_FAST)       || 9,
    MA_SLOW:       parseInt(process.env.MA_SLOW)       || 21,
    MA_TREND:      parseInt(process.env.MA_TREND)      || 200,
    RSI_PERIOD:    parseInt(process.env.RSI_PERIOD)    || 14,
    RSI_OVERBOUGHT: parseInt(process.env.RSI_OVERBOUGHT) || 75,
    RSI_OVERSOLD:   parseInt(process.env.RSI_OVERSOLD)   || 25,

    // Scanner de pares (Futuros ByBit USDT-Perp)
    SCAN_SYMBOLS: [
          'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
          'DOGEUSDT', 'NEARUSDT', 'LINKUSDT', 'DOTUSDT', 'LTCUSDT',
          'BNBUSDT', 'TRXUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT',
        ],

    // Intervalo de analise
    ANALYSIS_INTERVAL_MS: parseInt(process.env.ANALYSIS_INTERVAL_MS) || 30000,

    // Modo de operacao
    DRY_RUN: process.env.DRY_RUN !== 'false',

    // Arquivo de estado persistente (para sobreviver a reinicializacoes)
    STATE_FILE: process.env.STATE_FILE || './logs/bot_state.json',
};
