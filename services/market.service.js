const { publicGet } = require('./bybit.service');
const cfg = require('../config/settings');

// Candles - ByBit Futures V5 /v5/market/kline
async function getCandles(symbol, interval, limit) {
  symbol = symbol || cfg.SYMBOL;
  interval = interval || '15';
  limit = limit || 210;
  const data = await publicGet('/v5/market/kline', {
    category: 'linear',
    symbol,
    interval,
    limit
  });
  const list = data.result.list;
  return list.map(function(c) {
    return {
      openTime: parseInt(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
      closeTime: parseInt(c[0]) + 60000
    };
  }).reverse();
}

// Ticker 24h - ByBit Futures V5 /v5/market/tickers
async function getTicker(symbol) {
  symbol = symbol || cfg.SYMBOL;
  const data = await publicGet('/v5/market/tickers', {
    category: 'linear',
    symbol
  });
  const d = data.result.list[0];
  return {
    symbol: d.symbol,
    price: parseFloat(d.lastPrice),
    change24h: parseFloat(d.price24hPcnt) * 100,
    volume24h: parseFloat(d.turnover24h),
    high24h: parseFloat(d.highPrice24h),
    low24h: parseFloat(d.lowPrice24h),
    bidPrice: parseFloat(d.bid1Price),
    askPrice: parseFloat(d.ask1Price),
    openInterest: parseFloat(d.openInterest || 0)
  };
}

// Order Book - ByBit Futures V5 /v5/market/orderbook
async function getOrderBook(symbol, limit) {
  symbol = symbol || cfg.SYMBOL;
  limit = limit || 20;
  const data = await publicGet('/v5/market/orderbook', {
    category: 'linear',
    symbol,
    limit
  });
  const book = data.result;
  const totalBid = book.b.reduce(function(s, b) { return s + parseFloat(b[1]); }, 0);
  const totalAsk = book.a.reduce(function(s, a) { return s + parseFloat(a[1]); }, 0);
  return {
    totalBid,
    totalAsk,
    ratio: totalBid / (totalBid + totalAsk)
  };
}

// Calcula quantidade para futuros com leverage
function calcQty(capital, price) {
  var leverage = cfg.LEVERAGE || 10;
  var posicao = capital * cfg.MAX_POSITION_PERCENT * leverage;
  var qty = posicao / price;
  return Math.floor(qty * 1000) / 1000;
}

// Scanner de melhor par Futuros ByBit
async function scanBestSymbol() {
  console.log('Escaneando melhores pares Futuros ByBit...');
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
        openInterest: ticker.openInterest,
        notional,
        score: Math.abs(ticker.change24h) * (ticker.volume24h / 1e9)
      });
    } catch (err) {
      console.log('  Erro ao escanear ' + symbol + ': ' + err.message);
    }
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
            openInterest: t.openInterest,
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

  console.log('Top 3 pares Futuros ByBit:');
  candidates.slice(0, 3).forEach(function(c) {
    console.log('  ' + c.symbol + ' | $' + c.price + ' | Var: ' + c.change24h.toFixed(2) + '% | Vol: $' + (c.volume24h/1e6).toFixed(0) + 'M');
  });

  var best = candidates[0].symbol;
  console.log('Melhor par selecionado: ' + best);
  return best;
}

module.exports = { getCandles, getTicker, getOrderBook, scanBestSymbol };
