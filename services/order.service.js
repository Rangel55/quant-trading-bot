const { privatePost, privateGet, privateDelete, setLeverage, setMarginType } = require('./binance.service');
const cfg = require('../config/settings');

// Retorna saldo disponivel na conta Futures
async function getFuturesBalance() {
    const account = await privateGet('/fapi/v2/account');
    const usdt = account.assets.find(function(a) { return a.asset === 'USDT'; });
    return usdt ? parseFloat(usdt.availableBalance) : 0;
}

// Retorna posicoes abertas atualmente
async function getOpenPositions(symbol) {
    const account = await privateGet('/fapi/v2/account');
    return account.positions.filter(function(p) {
          var hasPosition = parseFloat(p.positionAmt) !== 0;
          if (symbol) return p.symbol === symbol && hasPosition;
          return hasPosition;
    });
}

// Configura alavancagem e margem antes de operar
async function setupSymbol(symbol) {
    symbol = symbol || cfg.SYMBOL;
    await setMarginType(symbol, cfg.MARGIN_TYPE);
    await setLeverage(symbol, cfg.LEVERAGE);
}

// Abre posicao LONG (compra) em futuros
async function openLong(symbol, quantity) {
    symbol = symbol || cfg.SYMBOL;
    const params = {
          symbol: symbol,
          side: 'BUY',
          type: 'MARKET',
          quantity: quantity.toString(),
    };
    const result = await privatePost('/fapi/v1/order', params);
    console.log('LONG aberto: ' + quantity + ' ' + symbol + ' | OrderId: ' + result.orderId);
    return result;
}

// Abre posicao SHORT (venda) em futuros
async function openShort(symbol, quantity) {
    symbol = symbol || cfg.SYMBOL;
    const params = {
          symbol: symbol,
          side: 'SELL',
          type: 'MARKET',
          quantity: quantity.toString(),
    };
    const result = await privatePost('/fapi/v1/order', params);
    console.log('SHORT aberto: ' + quantity + ' ' + symbol + ' | OrderId: ' + result.orderId);
    return result;
}

// Fecha posicao aberta (LONG ou SHORT)
async function closePosition(symbol, quantity, side) {
    symbol = symbol || cfg.SYMBOL;
    // Para fechar: se estava LONG (BUY), fecha com SELL e vice-versa
  var closeSide = side === 'BUY' ? 'SELL' : 'BUY';
    const params = {
          symbol: symbol,
          side: closeSide,
          type: 'MARKET',
          quantity: quantity.toString(),
          reduceOnly: 'true',
    };
    const result = await privatePost('/fapi/v1/order', params);
    console.log('Posicao fechada: ' + symbol + ' | Side: ' + closeSide);
    return result;
}

// Coloca ordem de stop-loss em futuros
async function placeStopLoss(symbol, side, quantity, stopPrice) {
    symbol = symbol || cfg.SYMBOL;
    var closeSide = side === 'BUY' ? 'SELL' : 'BUY';
    try {
          const params = {
                  symbol: symbol,
                  side: closeSide,
                  type: 'STOP_MARKET',
                  quantity: quantity.toString(),
                  stopPrice: stopPrice.toFixed(4),
                  reduceOnly: 'true',
          };
          return await privatePost('/fapi/v1/order', params);
    } catch (err) {
          console.error('Erro ao colocar stop-loss:', err.message);
    }
}

// Coloca ordem de take-profit em futuros
async function placeTakeProfit(symbol, side, quantity, takeProfitPrice) {
    symbol = symbol || cfg.SYMBOL;
    var closeSide = side === 'BUY' ? 'SELL' : 'BUY';
    try {
          const params = {
                  symbol: symbol,
                  side: closeSide,
                  type: 'TAKE_PROFIT_MARKET',
                  quantity: quantity.toString(),
                  stopPrice: takeProfitPrice.toFixed(4),
                  reduceOnly: 'true',
          };
          return await privatePost('/fapi/v1/order', params);
    } catch (err) {
          console.error('Erro ao colocar take-profit:', err.message);
    }
}

// Cancela todas as ordens abertas de um simbolo
async function cancelAllOrders(symbol) {
    symbol = symbol || cfg.SYMBOL;
    try {
          await privateDelete('/fapi/v1/allOpenOrders', { symbol: symbol });
          console.log('Ordens canceladas: ' + symbol);
    } catch (err) {
          console.error('Erro ao cancelar ordens:', err.message);
    }
}

module.exports = {
    getFuturesBalance,
    getOpenPositions,
    setupSymbol,
    openLong,
    openShort,
    closePosition,
    placeStopLoss,
    placeTakeProfit,
    cancelAllOrders,
};
