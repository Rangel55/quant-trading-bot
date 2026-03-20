const { publicGet } = require('./binance.service');
const cfg = require('../config/settings');

// Busca candles de futuros
async function getCandles(symbol, interval, limit) {
    symbol = symbol || cfg.SYMBOL;
    interval = interval || '15m';
    limit = limit || 210;
    const candles = await publicGet('/fapi/v1/klines', {
          symbol: symbol,
          interval: interval,
          limit: limit,
    });
    return candles.map(function(c) {
          return {
                  openTime: c[0],
                  open: parseFloat(c[1]),
                  high: parseFloat(c[2]),
                  low: parseFloat(c[3]),
                  close: parseFloat(c[4]),
                  volume: parseFloat(c[5]),
                  closeTime: c[6],
          };
    });
}

// Busca ticker 24h de futuros
async function getTicker(symbol) {
    symbol = symbol || cfg.SYMBOL;
    const d = await publicGet('/fapi/v1/ticker/24hr', { symbol: symbol });
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

// Busca order book de futuros
async function getOrderBook(symbol, limit) {
    symbol = symbol || cfg.SYMBOL;
    limit = limit || 20;
    const book = await publicGet('/fapi/v1/depth', { symbol: symbol, limit: limit });
    const totalBid = book.bids.reduce(function(s, b) { return s + parseFloat(b[1]); }, 0);
    const totalAsk = book.asks.reduce(function(s, a) { return s + parseFloat(a[1]); }, 0);
    return {
          totalBid: totalBid,
          totalAsk: totalAsk,
          ratio: totalBid / (totalBid + totalAsk),
    };
}

// Busca funding rate atual (exclusivo de futuros)
async function getFundingRate(symbol) {
    symbol = symbol || cfg.SYMBOL;
    try {
          const data = await publicGet('/fapi/v1/premiumIndex', { symbol: symbol });
          return {
                  fundingRate: parseFloat(data.lastFundingRate),
                  markPrice: parseFloat(data.markPrice),
                  indexPrice: parseFloat(data.indexPrice),
          };
    } catch (err) {
          return { fundingRate: 0, markPrice: 0, indexPrice: 0 };
    }
}

// SCANNER: Varre todos os pares e retorna o melhor para operar
async function scanBestSymbol() {
    console.log('Escaneando melhores pares de futuros...');
    var candidates = [];

  for (var i = 0; i < cfg.SCAN_SYMBOLS.length; i++) {
        var symbol = cfg.SCAN_SYMBOLS[i];
        try {
                var ticker = await getTicker(symbol);

          // Filtra por volume minimo e variacao minima
          if (ticker.volume24h < cfg.MIN_VOLUME_24H) continue;
                if (Math.abs(ticker.change24h) < cfg.MIN_CHANGE_24H) continue;

          candidates.push({
                    symbol: symbol,
                    price: ticker.price,
                    change24h: ticker.change24h,
                    volume24h: ticker.volume24h,
                    score: Math.abs(ticker.change24h) * (ticker.volume24h / 1e9),
          });
        } catch (err) {
                // ignora pares com erro
        }
  }

  if (candidates.length === 0) {
        console.log('Nenhum par com criterios suficientes. Usando ' + cfg.SYMBOL);
        return cfg.SYMBOL;
  }

  // Ordena pelo score (volume * variacao)
  candidates.sort(function(a, b) { return b.score - a.score; });

  console.log('Top 3 pares:');
    candidates.slice(0, 3).forEach(function(c) {
          console.log('  ' + c.symbol + ' | Var: ' + c.change24h.toFixed(2) + '% | Vol: $' + (c.volume24h / 1e9).toFixed(2) + 'B | Score: ' + c.score.toFixed(2));
    });

  var best = candidates[0].symbol;
    console.log('Melhor par selecionado: ' + best);
    return best;
}

module.exports = { getCandles, getTicker, getOrderBook, getFundingRate, scanBestSymbol };
