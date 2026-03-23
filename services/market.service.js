const { publicGet } = require('./binance.service');
const cfg = require('../config/settings');

// Candles - Spot usa /api/v3/klines
async function getCandles(symbol, interval, limit) {
  symbol = symbol || cfg.SYMBOL;
  interval = interval || '15m';
  limit = limit || 210;
  const candles = await publicGet('/api/v3/klines', { symbol, interval, limit });
  return candles.map(function(c) {
    return {
      openTime: c[0],
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
      closeTime: c[6]
    };
  });
}

// Ticker 24h - Spot usa /api/v3/ticker/24hr
async function getTicker(symbol) {
  symbol = symbol || cfg.SYMBOL;
  const d = await publicGet('/api/v3/ticker/24hr', { symbol });
  return {
    symbol: d.symbol,
    price: parseFloat(d.lastPrice),
    change24h: parseFloat(d.priceChangePercent),
    volume24h: parseFloat(d.quoteVolume),
    high24h: parseFloat(d.highPrice),
    low24h: parseFloat(d.lowPrice),
    bidPrice: parseFloat(d.bidPrice || d.lastPrice),
    askPrice: parseFloat(d.askPrice || d.lastPrice),
  };
}

// Order Book - Spot usa /api/v3/depth
async function getOrderBook(symbol, limit) {
  symbol = symbol || cfg.SYMBOL;
  limit = limit || 20;
  const book = await publicGet('/api/v3/depth', { symbol, limit });
  const totalBid = book.bids.reduce(function(s, b) { return s + parseFloat(b[1]); }, 0);
  const totalAsk = book.asks.reduce(function(s, a) { return s + parseFloat(a[1]); }, 0);
  return {
    totalBid,
    totalAsk,
    ratio: totalBid / (totalBid + totalAsk)
  };
}

// Scanner de melhor par Spot (sem leverage)
function calcQty(capital, price) {
  var posicao = capital * cfg.MAX_POSITION_PERCENT;
  return Math.floor((posicao / price) * 1000) / 1000;
}

async function scanBestSymbol() {
  console.log('Escaneando melhores pares Spot...');
  var capital = cfg.CAPITAL_USDT;
  var candidates = [];

  for (var i = 0; i < cfg.SCAN_SYMBOLS.length; i++) {
    var symbol = cfg.SCAN_SYMBOLS[i];
    try {
      var ticker = await getTicker(symbol);
      if (ticker.volume24h < cfg.MIN_VOLUME_24H) continue;
      if (Math.abs(ticker.change24h) < cfg.MIN_CHANGE_24H) continue;
      var qty = calcQty(capital, ticker.price);
      var notional = qty * ticker.price;
      if (qty <= 0 || notional < 1) {
        console.log('  ' + symbol + ' ignorado: valor $' + notional.toFixed(2) + ' insuficiente');
        continue;
      }
      candidates.push({
        symbol,
        price: ticker.price,
        change24h: ticker.change24h,
        volume24h: ticker.volume24h,
        notional,
        score: Math.abs(ticker.change24h) * (ticker.volume24h / 1e9)
      });
    } catch (err) {}
  }

  if (candidates.length === 0) {
    console.log('Sem candidatos nos criterios padrao. Relaxando filtros...');
    for (var j = 0; j < cfg.SCAN_SYMBOLS.length; j++) {
      var sym = cfg.SCAN_SYMBOLS[j];
      try {
        var t = await getTicker(sym);
        var q = calcQty(capital, t.price);
        if (q > 0 && q * t.price >= 1) {
          candidates.push({
            symbol: sym,
            price: t.price,
            change24h: t.change24h,
            volume24h: t.volume24h,
            notional: q * t.price,
            score: Math.abs(t.change24h) * (t.volume24h / 1e9)
          });
        }
      } catch (err) {}
    }
  }

  if (candidates.length === 0) {
    console.log('AVISO: Nenhum par operavel com $' + capital + '. Verifique o saldo.');
    return cfg.SYMBOL;
  }

  candidates.sort(function(a, b) { return b.score - a.score; });
  console.log('Top 3 pares Spot:');
  candidates.slice(0, 3).forEach(function(c) {
    console.log('  ' + c.symbol + ' | $' + c.price + ' | Var: ' + c.change24h.toFixed(2) + '% | Val: $' + c.notional.toFixed(2));
  });

  var best = candidates[0].symbol;
  console.log('Melhor par selecionado: ' + best);
  return best;
}

module.exports = { getCandles, getTicker, getOrderBook, scanBestSymbol };
