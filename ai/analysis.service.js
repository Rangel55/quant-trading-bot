const cfg = require('../config/settings');

function sma(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce(function(a, b) { return a + b; }, 0) / period;
}

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

function atr(candles, period) {
  period = period || 14;
  if (candles.length < period + 1) return null;
  const slice = candles.slice(-(period + 1));
  const trs = [];
  for (let i = 1; i < slice.length; i++) {
    const h = slice[i].high, l = slice[i].low, pc = slice[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.reduce(function(a, b) { return a + b; }, 0) / period;
}

function swingStructure(candles, lookback) {
  lookback = lookback || 20;
  const slice = candles.slice(-lookback);
  const highs = slice.map(function(c) { return c.high; });
  const lows = slice.map(function(c) { return c.low; });
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

function analyze(candles, orderBook) {
  const closes = candles.map(function(c) { return c.close; });
  const price = closes[closes.length - 1];
  const maFast = sma(closes, cfg.MA_FAST);
  const maSlow = sma(closes, cfg.MA_SLOW);
  const maTrend = sma(closes, cfg.MA_TREND);
  const rsiVal = rsi(closes);
  const atrVal = atr(candles);
  const swing = swingStructure(candles);
  const volatility = atrVal ? atrVal / price : 0;
  const isVolatile = volatility >= cfg.MIN_VOLATILITY;

  var maTrendSignal = 'NEUTRAL';
  if (maFast && maSlow && price > maFast && maFast > maSlow) maTrendSignal = 'BULL';
  if (maFast && maSlow && price < maFast && maFast < maSlow) maTrendSignal = 'BEAR';

  var momentum = 'NEUTRAL';
  if (rsiVal && rsiVal > 45 && rsiVal < cfg.RSI_OVERBOUGHT) momentum = 'BULLISH';
  if (rsiVal && rsiVal < 55 && rsiVal > cfg.RSI_OVERSOLD) momentum = 'BEARISH';

  var bookBias = 'BALANCED';
  if (orderBook.ratio > 0.52) bookBias = 'BUY_PRESSURE';
  if (orderBook.ratio < 0.48) bookBias = 'SELL_PRESSURE';

  const bullCount = (maTrendSignal === 'BULL' ? 1 : 0) +
    (momentum === 'BULLISH' ? 1 : 0) +
    (swing === 'UPTREND' ? 1 : 0) +
    (bookBias === 'BUY_PRESSURE' ? 1 : 0);

  const bearCount = (maTrendSignal === 'BEAR' ? 1 : 0) +
    (momentum === 'BEARISH' ? 1 : 0) +
    (swing === 'DOWNTREND' ? 1 : 0) +
    (bookBias === 'SELL_PRESSURE' ? 1 : 0);

  var decision;
  if (bullCount > bearCount) {
    decision = 'COMPRAR';
  } else if (bearCount > bullCount) {
    decision = 'VENDER';
  } else {
    decision = (rsiVal && rsiVal >= 50) ? 'COMPRAR' : 'VENDER';
  }

  return { price, maFast, maSlow, maTrend, rsiVal, atrVal, volatility, isVolatile, maTrendSignal, momentum, swing, bookBias, bullCount, bearCount, decision };
}

module.exports = { analyze };
