const { publicGet, privateGet } = require('./bybit.service');
const cfg = require('../config/settings');

// Valida conexao com ByBit Futures
async function validateConnection() {
  var errors = [];
  var warnings = [];

  // 1. Verifica conectividade publica (server time)
  try {
    const timeData = await publicGet('/v5/market/time', {});
    if (!timeData || !timeData.result) throw new Error('Resposta invalida do servidor');
    var serverTime = parseInt(timeData.result.timeNano) / 1e6;
    var localTime = Date.now();
    var drift = Math.abs(serverTime - localTime);
    if (drift > 5000) {
      warnings.push('Diferenca de tempo: ' + drift + 'ms (max recomendado: 5000ms)');
    }
    console.log('Conectividade publica ByBit: OK (drift: ' + drift + 'ms)');
  } catch (err) {
    errors.push('Falha na conectividade publica: ' + err.message);
  }

  // 2. Verifica autenticacao (carteira UNIFIED)
  try {
    const walletData = await privateGet('/v5/account/wallet-balance', {
      accountType: 'UNIFIED',
      coin: 'USDT'
    });
    if (!walletData || walletData.retCode !== 0) {
      throw new Error('retCode: ' + (walletData && walletData.retCode) + ' - ' + (walletData && walletData.retMsg));
    }
    var list = walletData.result.list;
    var coin = list && list[0] && list[0].coin.find(function(c) { return c.coin === 'USDT'; });
    var balance = coin ? parseFloat(coin.walletBalance || 0) : 0;
    console.log('Autenticacao ByBit: OK | Saldo USDT: $' + balance.toFixed(2));
  } catch (err) {
    errors.push('Falha na autenticacao: ' + err.message);
  }

  // 3. Verifica acesso ao par principal nos Futuros
  try {
    const tickerData = await publicGet('/v5/market/tickers', {
      category: 'linear',
      symbol: cfg.SYMBOL
    });
    if (!tickerData || !tickerData.result || !tickerData.result.list || tickerData.result.list.length === 0) {
      throw new Error('Par ' + cfg.SYMBOL + ' nao encontrado nos Futuros ByBit');
    }
    var ticker = tickerData.result.list[0];
    console.log('Par Futuros ' + cfg.SYMBOL + ': OK | Preco: $' + ticker.lastPrice);
  } catch (err) {
    errors.push('Falha ao verificar par ' + cfg.SYMBOL + ': ' + err.message);
  }

  // Resultado
  if (errors.length > 0) {
    console.error('VALIDACAO FALHOU:');
    errors.forEach(function(e) { console.error('  - ' + e); });
    throw new Error('Falhas de validacao: ' + errors.join('; '));
  }

  if (warnings.length > 0) {
    warnings.forEach(function(w) { console.warn('AVISO: ' + w); });
  }

  console.log('Validacao ByBit Futures: APROVADA');
  return true;
}

module.exports = { validateConnection };
