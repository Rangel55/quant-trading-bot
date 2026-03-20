require('dotenv').config();

module.exports = {
    // --- API Binance Futures ---
    API_KEY: process.env.BINANCE_API_KEY,
    API_SECRET: process.env.BINANCE_API_SECRET,
    BASE_URL: 'https://fapi.binance.com',   // Futures endpoint

    // --- Selecao automatica de moeda ---
    // SYMBOL sera escolhido dinamicamente pelo scanner de mercado
    // mas pode forcar um par aqui se quiser
    SYMBOL: process.env.SYMBOL || 'BTCUSDT',

    // --- Capital disponivel (em USDT) ---
    CAPITAL_USDT: parseFloat(process.env.CAPITAL_USDT) || 20,

    // --- Alavancagem ---
    LEVERAGE: parseInt(process.env.LEVERAGE) || 5,       // 5x padrao (equilibrio risco/retorno)
    MARGIN_TYPE: 'ISOLATED',                              // ISOLATED protege o restante do capital

    // --- Gestao de risco (Futures) ---
    MAX_POSITION_PERCENT: 0.20,   // 20% do capital por trade (alavancado)
    MAX_DAILY_TRADES: 10,         // mais trades pois futures e mais liquido
    MIN_VOLATILITY: 0.003,        // volatilidade minima 0.3%
    STOP_LOSS_PERCENT: 0.015,     // stop loss 1.5%
    TAKE_PROFIT_PERCENT: 0.04,    // take profit 4% (melhor R:R alavancado)
    TRAILING_STOP: true,          // trailing stop para maximizar lucro

    // --- Parametros tecnicos ---
    MA_FAST: 9,
    MA_SLOW: 21,
    MA_TREND: 200,
    RSI_PERIOD: 14,
    RSI_OVERBOUGHT: 70,
    RSI_OVERSOLD: 30,

    // --- Scanner de melhores moedas ---
    // Pares monitorados para selecao automatica do melhor
    SCAN_SYMBOLS: [
          'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
          'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
          'MATICUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT', 'APTUSDT'
        ],

    // --- Criterios de selecao do melhor par ---
    MIN_VOLUME_24H: 50000000,     // volume minimo 24h em USDT (50M)
    MIN_CHANGE_24H: 1.5,          // variacao minima 24h em % para ter momentum

    // --- Intervalo de analise ---
    ANALYSIS_INTERVAL_MS: 30000,  // 30 segundos (mais rapido para futures)

    // --- Modo de execucao ---
    DRY_RUN: process.env.DRY_RUN !== 'false',
};
