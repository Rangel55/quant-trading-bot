const { publicGet } = require('./binance.service');
const { SYMBOL }    = require('../config/settings');

async function getCandles(interval, limit) {
  interval = interval || '1h';
  limit = limit || 210;
  const candles = await publicGet('/api/v3/klines', { symbol: SYMBOL, interval, limit });
  return candles.map(c => ({
    openTime:  c[0],
    open:      parseFloat(c[1]),
    high:      parseFloat(c[2]),
    low:       parseFloat(c[3]),
    close:     parseFloat(c[4]),
    volume:    parseFloat(c[5]),
    closeTime: c[6],
  }));
}

async function getTicker() {
  const d = await publicGet('/api/v3/ticker/24hr', { symbol: SYMBOL });
  return {
    price:     parseFloat(d.lastPrice),
    change24h: parseFloat(d.priceChangePercent),
    volume24h: parseFloat(d.quoteVolume),
    high24h:   parseFloat(d.highPrice),
    low24h:    parseFloat(d.lowPrice),
    bidPrice:  parseFloat(d.bidPrice),
    askPrice:  parseFloat(d.askPrice),
  };
}

async function getOrderBook(limit) {
  limit = limit || 20;
  const book = await publicGet('/api/v3/depth', { symbol: SYMBOL, limit });
  const totalBid = book.bids.reduce(function(s, b) { return s + parseFloat(b[1]); }, 0);
  const totalAsk = book.asks.reduce(function(s, a) { return s + parseFloat(a[1]); }, 0);
  return {
    totalBid: totalBid,
    totalAsk: totalAsk,
    ratio: totalBid / (totalBid + totalAsk),
  };
}

module.exports = { getCandles, getTicker, getOrderBook };
