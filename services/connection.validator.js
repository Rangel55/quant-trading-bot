const { publicGet, privateGet } = require('./binance.service');
const { API_KEY, SYMBOL } = require('../config/settings');

async function testPublicConnection() {
  try {
    await publicGet('/api/v3/ping');
    const timeData = await publicGet('/api/v3/time');
    const diff = Math.abs(Date.now() - timeData.serverTime);
    if (diff > 5000) console.warn('AVISO: Diferenca de horario: ' + diff + 'ms');
    console.log('Conexao Spot OK | Server time: ' + new Date(timeData.serverTime).toISOString());
    return true;
  } catch (err) {
    console.error('ERRO conexao Spot: ' + err.message);
    return false;
  }
}

async function testPrivateConnection() {
  if (!API_KEY || API_KEY === 'cole_sua_api_key_aqui') {
    console.error('ERRO: BINANCE_API_KEY nao configurada');
    return false;
  }
  try {
    const account = await privateGet('/api/v3/account');
    const usdt = account.balances.find(function(b) { return b.asset === 'USDT'; });
    const balance = usdt ? parseFloat(usdt.free) : 0;
    console.log('Autenticacao Spot OK | Saldo USDT: $' + balance.toFixed(2));
    return true;
  } catch (err) {
    if (err.response && err.response.data) {
      console.error('ERRO Binance [' + err.response.data.code + ']: ' + err.response.data.msg);
    } else {
      console.error('ERRO autenticacao Spot: ' + err.message);
    }
    return false;
  }
}

async function testSymbol() {
  try {
    const info = await publicGet('/api/v3/exchangeInfo', { symbol: SYMBOL });
    var symbolInfo = info.symbols && info.symbols.find(function(s) { return s.symbol === SYMBOL; });
    if (!symbolInfo || symbolInfo.status !== 'TRADING') {
      console.error('ERRO: Simbolo ' + SYMBOL + ' invalido para Spot.');
      return false;
    }
    console.log('Simbolo OK | ' + SYMBOL + ' | Status: ' + symbolInfo.status);
    return true;
  } catch (err) {
    console.error('ERRO ao validar simbolo: ' + err.message);
    return false;
  }
}

async function runFullValidation(dryRun) {
  console.log('');
  console.log('==============================================');
  console.log(' VALIDACAO DE SEGURANCA - SPOT');
  console.log('==============================================');

  var results = {
    publicConnection: false,
    privateConnection: false,
    symbolValid: false,
    allPassed: false
  };

  console.log('Teste 1/3: Conexao com Binance Spot...');
  results.publicConnection = await testPublicConnection();
  if (!results.publicConnection) {
    console.error('FALHA: Sem conexao.');
    return results;
  }

  console.log('Teste 2/3: Autenticacao da API Spot...');
  if (dryRun && (!API_KEY || API_KEY === 'cole_sua_api_key_aqui')) {
    console.log('DRY RUN sem chaves - pulando autenticacao');
    results.privateConnection = true;
  } else {
    results.privateConnection = await testPrivateConnection();
    if (!results.privateConnection) {
      console.error('FALHA: Autenticacao invalida.');
      return results;
    }
  }

  console.log('Teste 3/3: Validando simbolo ' + SYMBOL + ' no Spot...');
  results.symbolValid = await testSymbol();
  if (!results.symbolValid) {
    console.error('FALHA: Simbolo invalido.');
    return results;
  }

  results.allPassed = true;
  console.log('==============================================');
  console.log(' TODOS OS TESTES PASSARAM - Sistema OK');
  console.log('==============================================');
  console.log('');
  return results;
}

module.exports = { testPublicConnection, testPrivateConnection, testSymbol, runFullValidation };
