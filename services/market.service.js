const { publicGet } = require('./bybit.service');
const cfg = require('../config/settings');

// Cache de instrument info para nao chamar a API a cada ciclo
var instrumentCache = {};

// Busca as regras do par na ByBit (minOrderQty, qtyStep, minNotionalValue)
// Cacheia por 1 hora para evitar excesso de chamadas
async function getInstrumentInfo(symbol) {
    symbol = symbol || cfg.SYMBOL;
    var now = Date.now();
    if (instrumentCache[symbol] && (now - instrumentCache[symbol].ts) < 3600000) {
          return instrumentCache[symbol].data;
    }
    try {
          var data = await publicGet('/v5/market/instruments-info', {
                  category: 'linear',
                  symbol: symbol
          });
          var info = data.result.list && data.result.list[0];
          if (!info) throw new Error('Instrumento nao encontrado: ' + symbol);
          var lotFilter = info.lotSizeFilter || {};
          var result = {
                  minOrderQty:  parseFloat(lotFilter.minOrderQty  || 0.001),
                  maxOrderQty:  parseFloat(lotFilter.maxOrderQty  || 999999),
                  qtyStep:      parseFloat(lotFilter.qtyStep      || 0.001),
                  minNotional:  parseFloat(lotFilter.minNotionalValue || 0),
          };
          instrumentCache[symbol] = { ts: now, data: result };
          console.log('[INSTRUMENT] ' + symbol + ' | minQty: ' + result.minOrderQty + ' | step: ' + result.qtyStep + ' | minNotional: $' + result.minNotional);
          return result;
    } catch (err) {
          console.warn('[INSTRUMENT] Erro ao buscar regras de ' + symbol + ': ' + err.message + '. Usando defaults.');
          return { minOrderQty: 0.001, maxOrderQty: 999999, qtyStep: 0.001, minNotional: 0 };
    }
}

// Ajusta qty respeitando qtyStep e minOrderQty da ByBit
// Retorna null se qty for menor que o minimo permitido
async function normalizeQty(symbol, rawQty, price) {
    var rules = await getInstrumentInfo(symbol);
    var step = rules.qtyStep;

  // Arredonda para baixo no multiplo correto do step
  var decimals = (step.toString().split('.')[1] || '').length;
    var factor = Math.pow(10, decimals);
    var qty = Math.floor(rawQty / step) * step;
    qty = Math.round(qty * factor) / factor; // corrige floating point

  // Verifica minimo
  if (qty < rules.minOrderQty) {
        console.warn('[QTY] ' + symbol + ' qty calculado (' + rawQty.toFixed(6) + ') abaixo do minimo (' + rules.minOrderQty + '). Ordem bloqueada.');
        return null;
  }

  // Verifica notional minimo (qty * price)
  if (rules.minNotional > 0 && qty * price < rules.minNotional) {
        console.warn('[QTY] ' + symbol + ' notional $' + (qty * price).toFixed(2) + ' abaixo do minimo $' + rules.minNotional + '. Ordem bloqueada.');
        return null;
  }

  if (qty !== rawQty) {
        console.log('[QTY] ' + symbol + ' qty ajustado: ' + rawQty.toFixed(6) + ' -> ' + qty + ' (step: ' + step + ')');
  }
    return qty;
}

// Candles - ByBit Futures V5 /v5/market/kline
async function getCandles(symbol, interval, limit) {
    symbol = symbol || cfg.SYMBOL;
    interval = interval || '15';
    limit = limit || 210;
    const data = await publicGet('/v5/market/kline', { category: 'linear', symbol, interval, limit });
    const list = data.result.list;
    return list.map(function(c) {
          return {
                  openTime:  parseInt(c[0]),
                  open:      parseFloat(c[1]),
                  high:      parseFloat(c[2]),
                  low:       parseFloat(c[3]),
                  close:     parseFloat(c[4]),
                  volume:    parseFloat(c[5]),
                  closeTime: parseInt(c[0]) + 60000
          };
    }).reverse();
}

// Ticker 24h - ByBit Futures V5 /v5/market/tickers
async function getTicker(symbol) {
    symbol = symbol || cfg.SYMBOL;
    const data = await publicGet('/v5/market/tickers', { category: 'linear', symbol });
    const d = data.result.list[0];
    return {
          symbol:       d.symbol,
          price:        parseFloat(d.lastPrice),
          change24h:    parseFloat(d.price24hPcnt) * 100,
          volume24h:    parseFloat(d.turnover24h),
          high24h:      parseFloat(d.highPrice24h),
          low24h:       parseFloat(d.lowPrice24h),
          bidPrice:     parseFloat(d.bid1Price),
          askPrice:     parseFloat(d.ask1Price),
          openInterest: parseFloat(d.openInterest || 0)
    };
}

// Order Book - ByBit Futures V5 /v5/market/orderbook
async function getOrderBook(symbol, limit) {
    symbol = symbol || cfg.SYMBOL;
    limit = limit || 20;
    const data = await publicGet('/v5/market/orderbook', { category: 'linear', symbol, limit });
    const book = data.result;
    const totalBid = book.b.reduce(function(s, b) { return s + parseFloat(b[1]); }, 0);
    const totalAsk = book.a.reduce(function(s, a) { return s + parseFloat(a[1]); }, 0);
    return { totalBid, totalAsk, ratio: totalBid / (totalBid + totalAsk) };
}

// Scanner de melhor par Futuros ByBit
async function scanBestSymbol() {
    console.log('Escaneando melhores pares Futuros ByBit...');
    var capital = cfg.CAPITAL_USDT;
    var leverage = cfg.LEVERAGE || 10;
    var candidates = [];

  for (var i = 0; i < cfg.SCAN_SYMBOLS.length; i++) {
        var symbol = cfg.SCAN_SYMBOLS[i];
        try {
                var ticker = await getTicker(symbol);
                if (ticker.volume24h < cfg.MIN_VOLUME_24H) continue;
                if (Math.abs(ticker.change24h) < cfg.MIN_CHANGE_24H) continue;

          // Calcula qty bruto e normaliza pelo step real do par
          var rawQty = (capital * cfg.MAX_POSITION_PERCENT * leverage) / ticker.price;
                var qty = await normalizeQty(symbol, rawQty, ticker.price);
                if (!qty) {
                          console.log('  ' + symbol + ' ignorado: qty invalido para capital $' + capital);
                          continue;
                }

          candidates.push({
                    symbol,
                    price:        ticker.price,
                    change24h:    ticker.change24h,
                    volume24h:    ticker.volume24h,
                    openInterest: ticker.openInterest,
                    notional:     qty * ticker.price,
                    score:        Math.abs(ticker.change24h) * (ticker.volume24h / 1e9)
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
                          var rawQ = (capital * cfg.MAX_POSITION_PERCENT * leverage) / t.price;
                          var q = await normalizeQty(sym, rawQ, t.price);
                          if (q) {
                                      candidates.push({
                                                    symbol: sym, price: t.price, change24h: t.change24h,
                                                    volume24h: t.volume24h, openInterest: t.openInterest,
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
          console.log('  ' + c.symbol + ' | $' + c.price + ' | Var: ' + c.change24h.toFixed(2) + '% | Vol: $' + (c.volume24h / 1e6).toFixed(0) + 'M');
    });

  var best = candidates[0].symbol;
    console.log('Melhor par selecionado: ' + best);
    return best;
}

module.exports = { getCandles, getTicker, getOrderBook, scanBestSymbol, getInstrumentInfo, normalizeQty };
