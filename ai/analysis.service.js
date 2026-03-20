const cfg = require('../config/settings');

// Media Movel Simples
function sma(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce(function(a, b) { return a + b; }, 0) / period;
}

// Indice de Forca Relativa (RSI)
function rsi(closes, period) {
  period = period || cfg.RSI_PERIOD;
  if (closes.length < period + 1) return null;
  const slice = closes.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}

// Average True Range (volatilidade)
function atr(candles, period) {
  period = period || 14;
  if (candles.length < period + 1) return null;
  const slice = candles.slice(-(period + 1));
  const trs = [];
  for (let i = 1; i < slice.length; i++) {
    const h = slice[i].high;
    const l = slice[i].low;
    const pc = slice[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.reduce(function(a, b) { return a + b; }, 0) / period;
}

// Estrutura de topos e fundos (Swing High/Low)
function swingStructure(candles, lookback) {
  lookback = lookback || 20;
  const slice = candles.slice(-lookback);
  const highs = slice.map(function(c) { return c.high; });
  const lows  = slice.map(function(c) { return c.low; });
  const rH = highs.slice(-5), rL = lows.slice(-5);
  const pH = highs.slice(0, -5), pL = lows.slice(0, -5);
  const hH = Math.max.apply(null, rH) > Math.max.apply(null, pH);
  const hL = Math.min.apply(null, rL) > Math.min.apply(null, pL);
  const lH = Math.max.apply(null, rH) < Math.max.apply(null, pH);
  const lL = Math.min.apply(null, rL) < Math.min.apply(null, pL);
  if (hH && hL) return 'UPTREND';
  if (lH && lL) return 'DOWNTREND';
  return 'SIDEWAYS';
}

// MOTOR DE ANALISE QUANTITATIVA PRINCIPAL
function analyze(candles, orderBook) {
  const closes = candles.map(function(c) { return c.close; });
  const price  = closes[closes.length - 1];

  const maFast  = sma(closes, cfg.MA_FAST);
  const maSlow  = sma(closes, cfg.MA_SLOW);
  const maTrend = sma(closes, cfg.MA_TREND);
  const rsiVal  = rsi(closes);
  const atrVal  = atr(candles);
  const swing   = swingStructure(candles);

  const volatility = atrVal / price;
  const isVolatile = volatility >= cfg.MIN_VOLATILITY;

  // Tendencia por medias moveis (Passo 4)
  var maTrendSignal = 'NEUTRAL';
  if (price > maFast && maFast > maSlow && price > maTrend) maTrendSignal = 'BULL';
  if (price < maFast && maFast < maSlow && price < maTrend) maTrendSignal = 'BEAR';

  // Momentum RSI (Passo 5)
  var momentum = 'NEUTRAL';
  if (rsiVal > 50 && rsiVal < cfg.RSI_OVERBOUGHT) momentum = 'BULLISH';
  if (rsiVal < 50 && rsiVal > cfg.RSI_OVERSOLD)   momentum = 'BEARISH';

  // Pressao order book
  var bookBias = 'BALANCED';
  if (orderBook.ratio > 0.55) bookBias = 'BUY_PRESSURE';
  if (orderBook.ratio < 0.45) bookBias = 'SELL_PRESSURE';

  // Contagem de sinais confluentes (Passo 6)
  const bullCount =
    (maTrendSignal === 'BULL'         ? 1 : 0) +
    (momentum      === 'BULLISH'      ? 1 : 0) +
    (swing         === 'UPTREND'      ? 1 : 0) +
    (bookBias      === 'BUY_PRESSURE' ? 1 : 0);

  const bearCount =
    (maTrendSignal === 'BEAR'          ? 1 : 0) +
    (momentum      === 'BEARISH'       ? 1 : 0) +
    (swing         === 'DOWNTREND'     ? 1 : 0) +
    (bookBias      === 'SELL_PRESSURE' ? 1 : 0);

  // DECISAO: minimo 3/4 sinais alinhados + volatilidade (Passo 7)
  var decision = 'ESPERAR';
  if (isVolatile && bullCount >= 3) decision = 'COMPRAR';
  if (isVolatile && bearCount >= 3) decision = 'VENDER';

  return {
    price: price,
    maFast: maFast,
    maSlow: maSlow,
    maTrend: maTrend,
    rsiVal: rsiVal,
    atrVal: atrVal,
    volatility: volatility,
    isVolatile: isVolatile,
    maTrendSignal: maTrendSignal,
    momentum: momentum,
    swing: swing,
    bookBias: bookBias,
    bullCount: bullCount,
    bearCount: bearCount,
    decision: decision,
  };
}

module.exports = { analyze };
