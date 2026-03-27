const { privateGet, privatePost } = require('./bybit.service');
const cfg = require('../config/settings');

// Retorna saldo disponivel na conta UNIFIED (USDT)
async function getWalletBalance() {
  const data = await privateGet('/v5/account/wallet-balance', {
    accountType: 'UNIFIED',
    coin: 'USDT'
  });
  const list = data.result.list;
  if (!list || list.length === 0) return 0;
  const coin = list[0].coin.find(function(c) { return c.coin === 'USDT'; });
  return coin ? parseFloat(coin.availableToWithdraw || coin.walletBalance || 0) : 0;
}

// Define leverage para um simbolo (Futuros Linear)
async function setLeverage(symbol, leverage) {
  symbol = symbol || cfg.SYMBOL;
  leverage = leverage || cfg.LEVERAGE || 10;
  try {
    await privatePost('/v5/position/set-leverage', {
      category: 'linear',
      symbol: symbol,
      buyLeverage: leverage.toString(),
      sellLeverage: leverage.toString()
    });
    console.log('Leverage definido: ' + leverage + 'x para ' + symbol);
  } catch (err) {
    if (!err.message || !err.message.includes('leverage not modified')) {
      console.error('Erro ao definir leverage:', err.message);
    }
  }
}

// Abre posicao LONG a mercado nos Futuros com SL/TP
async function openLong(symbol, quantity, entryPrice) {
  symbol = symbol || cfg.SYMBOL;
  await setLeverage(symbol, cfg.LEVERAGE);

  var sl = entryPrice ? (entryPrice * (1 - cfg.STOP_LOSS_PERCENT)).toFixed(4) : undefined;
  var tp = entryPrice ? (entryPrice * (1 + cfg.TAKE_PROFIT_PERCENT)).toFixed(4) : undefined;

  var params = {
    category: 'linear',
    symbol: symbol,
    side: 'Buy',
    orderType: 'Market',
    qty: quantity.toString(),
    timeInForce: 'IOC',
    reduceOnly: false,
    closeOnTrigger: false
  };

  if (sl) params.stopLoss = sl;
  if (tp) params.takeProfit = tp;

  const result = await privatePost('/v5/order/create', params);
  console.log('LONG aberto: ' + quantity + ' ' + symbol + ' | orderId: ' + (result.result && result.result.orderId));
  return result;
}

// Abre posicao SHORT a mercado nos Futuros com SL/TP
async function openShort(symbol, quantity, entryPrice) {
  symbol = symbol || cfg.SYMBOL;
  await setLeverage(symbol, cfg.LEVERAGE);

  var sl = entryPrice ? (entryPrice * (1 + cfg.STOP_LOSS_PERCENT)).toFixed(4) : undefined;
  var tp = entryPrice ? (entryPrice * (1 - cfg.TAKE_PROFIT_PERCENT)).toFixed(4) : undefined;

  var params = {
    category: 'linear',
    symbol: symbol,
    side: 'Sell',
    orderType: 'Market',
    qty: quantity.toString(),
    timeInForce: 'IOC',
    reduceOnly: false,
    closeOnTrigger: false
  };

  if (sl) params.stopLoss = sl;
  if (tp) params.takeProfit = tp;

  const result = await privatePost('/v5/order/create', params);
  console.log('SHORT aberto: ' + quantity + ' ' + symbol + ' | orderId: ' + (result.result && result.result.orderId));
  return result;
}

// Fecha posicao aberta (reduce-only market)
async function closePosition(symbol, side, quantity) {
  symbol = symbol || cfg.SYMBOL;
  var closeSide = side === 'Buy' ? 'Sell' : 'Buy';
  var params = {
    category: 'linear',
    symbol: symbol,
    side: closeSide,
    orderType: 'Market',
    qty: quantity.toString(),
    timeInForce: 'IOC',
    reduceOnly: true,
    closeOnTrigger: false
  };
  const result = await privatePost('/v5/order/create', params);
  console.log('Posicao fechada: ' + symbol + ' | side: ' + closeSide);
  return result;
}

// Cancela todas as ordens abertas de um simbolo nos Futuros
async function cancelAllOrders(symbol) {
  symbol = symbol || cfg.SYMBOL;
  try {
    await privatePost('/v5/order/cancel-all', {
      category: 'linear',
      symbol: symbol
    });
    console.log('Ordens canceladas: ' + symbol);
  } catch (err) {
    console.error('Erro ao cancelar ordens:', err.message);
  }
}

// Retorna posicoes abertas
async function getPositions(symbol) {
  symbol = symbol || cfg.SYMBOL;
  const data = await privateGet('/v5/position/list', {
    category: 'linear',
    symbol: symbol
  });
  return data.result.list || [];
}

module.exports = {
  getWalletBalance,
  setLeverage,
  openLong,
  openShort,
  closePosition,
  cancelAllOrders,
  getPositions
};
