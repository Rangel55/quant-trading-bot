const { privatePost, privateGet } = require('./binance.service');
const { SYMBOL } = require('../config/settings');

// Consulta saldo disponivel de um ativo
async function getBalance(asset) {
  asset = asset || 'USDT';
  const account = await privateGet('/api/v3/account');
  const balance = account.balances.find(function(b) { return b.asset === asset; });
  return balance ? parseFloat(balance.free) : 0;
}

// Envia ordem de mercado real na Binance
async function placeMarketOrder(side, quantity) {
  const params = {
    symbol:   SYMBOL,
    side:     side,
    type:     'MARKET',
    quantity: quantity.toString(),
  };
  const result = await privatePost('/api/v3/order', params);
  console.log('Ordem executada: ' + side + ' ' + quantity + ' ' + SYMBOL);
  return result;
}

// Coloca ordem de stop-loss automatico
async function placeStopOrder(side, quantity, stopPrice, limitPrice) {
  const params = {
    symbol:      SYMBOL,
    side:        side,
    type:        'STOP_LOSS_LIMIT',
    quantity:    quantity.toString(),
    stopPrice:   stopPrice.toFixed(2),
    price:       limitPrice.toFixed(2),
    timeInForce: 'GTC',
  };
  return await privatePost('/api/v3/order', params);
}

// Consulta ordens abertas
async function getOpenOrders() {
  return await privateGet('/api/v3/openOrders', { symbol: SYMBOL });
}

module.exports = { getBalance, placeMarketOrder, placeStopOrder, getOpenOrders };
