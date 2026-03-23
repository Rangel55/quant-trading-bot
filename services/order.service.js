const { privateGet, privatePost, privateDelete } = require('./binance.service');
const cfg = require('../config/settings');

// Retorna saldo disponivel na conta Spot (ativo USDT)
async function getSpotBalance() {
  const account = await privateGet('/api/v3/account');
  const usdt = account.balances.find(function(b) { return b.asset === 'USDT'; });
  return usdt ? parseFloat(usdt.free) : 0;
}

// Retorna saldo de um ativo especifico no Spot (ex: SOL, XRP)
async function getAssetBalance(asset) {
  const account = await privateGet('/api/v3/account');
  const found = account.balances.find(function(b) { return b.asset === asset; });
  return found ? parseFloat(found.free) : 0;
}

// Abre ordem de COMPRA a mercado no Spot
async function openBuy(symbol, quantity) {
  symbol = symbol || cfg.SYMBOL;
  const params = {
    symbol: symbol,
    side: 'BUY',
    type: 'MARKET',
    quantity: quantity.toString(),
  };
  const result = await privatePost('/api/v3/order', params);
  console.log('COMPRA executada: ' + quantity + ' ' + symbol + ' | OrderId: ' + result.orderId);
  return result;
}

// Abre ordem de VENDA a mercado no Spot
async function openSell(symbol, quantity) {
  symbol = symbol || cfg.SYMBOL;
  const params = {
    symbol: symbol,
    side: 'SELL',
    type: 'MARKET',
    quantity: quantity.toString(),
  };
  const result = await privatePost('/api/v3/order', params);
  console.log('VENDA executada: ' + quantity + ' ' + symbol + ' | OrderId: ' + result.orderId);
  return result;
}

// Coloca ordem de stop-loss limite no Spot (STOP_LOSS_LIMIT)
async function placeStopLoss(symbol, side, quantity, stopPrice, limitPrice) {
  symbol = symbol || cfg.SYMBOL;
  var closeSide = side === 'BUY' ? 'SELL' : 'BUY';
  limitPrice = limitPrice || stopPrice * (side === 'BUY' ? 0.999 : 1.001);
  try {
    const params = {
      symbol: symbol,
      side: closeSide,
      type: 'STOP_LOSS_LIMIT',
      quantity: quantity.toString(),
      price: limitPrice.toFixed(4),
      stopPrice: stopPrice.toFixed(4),
      timeInForce: 'GTC',
    };
    return await privatePost('/api/v3/order', params);
  } catch (err) {
    console.error('Erro ao colocar stop-loss Spot:', err.message);
  }
}

// Coloca ordem de take-profit limite no Spot (TAKE_PROFIT_LIMIT)
async function placeTakeProfit(symbol, side, quantity, takeProfitPrice) {
  symbol = symbol || cfg.SYMBOL;
  var closeSide = side === 'BUY' ? 'SELL' : 'BUY';
  var limitPrice = side === 'BUY'
    ? takeProfitPrice * 0.999
    : takeProfitPrice * 1.001;
  try {
    const params = {
      symbol: symbol,
      side: closeSide,
      type: 'TAKE_PROFIT_LIMIT',
      quantity: quantity.toString(),
      price: limitPrice.toFixed(4),
      stopPrice: takeProfitPrice.toFixed(4),
      timeInForce: 'GTC',
    };
    return await privatePost('/api/v3/order', params);
  } catch (err) {
    console.error('Erro ao colocar take-profit Spot:', err.message);
  }
}

// Cancela todas as ordens abertas de um simbolo no Spot
async function cancelAllOrders(symbol) {
  symbol = symbol || cfg.SYMBOL;
  try {
    await privateDelete('/api/v3/openOrders', { symbol });
    console.log('Ordens canceladas: ' + symbol);
  } catch (err) {
    console.error('Erro ao cancelar ordens:', err.message);
  }
}

module.exports = {
  getSpotBalance,
  getAssetBalance,
  openBuy,
  openSell,
  placeStopLoss,
  placeTakeProfit,
  cancelAllOrders,
};
