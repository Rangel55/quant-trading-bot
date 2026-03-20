const { publicGet, privateGet } = require('./binance.service');
const { API_KEY, API_SECRET, SYMBOL } = require('../config/settings');

async function testPublicConnection() {
    try {
          await publicGet('/fapi/v1/ping');
          const timeData = await publicGet('/fapi/v1/time');
          const diff = Math.abs(Date.now() - timeData.serverTime);
          if (diff > 5000) console.warn('AVISO: Diferenca de horario: ' + diff + 'ms');
          console.log('Conexao Futures OK | Server time: ' + new Date(timeData.serverTime).toISOString());
          return true;
    } catch (err) {
          console.error('ERRO conexao futures: ' + err.message);
          return false;
    }
}

async function testPrivateConnection() {
    if (!API_KEY || API_KEY === 'cole_sua_api_key_aqui') {
          console.error('ERRO: BINANCE_API_KEY nao configurada');
          return false;
    }
    try {
          const account = await privateGet('/fapi/v2/account');
          const usdtAsset = account.assets.find(function(a) { return a.asset === 'USDT'; });
          const balance = usdtAsset ? parseFloat(usdtAsset.availableBalance) : 0;
          console.log('Autenticacao Futures OK | Saldo: $' + balance.toFixed(2));
          return true;
    } catch (err) {
          if (err.response && err.response.data) {
                  console.error('ERRO Binance [' + err.response.data.code + ']: ' + err.response.data.msg);
          } else {
                  console.error('ERRO autenticacao futures: ' + err.message);
          }
          return false;
    }
}

async function testSymbol() {
    try {
          const info = await publicGet('/fapi/v1/exchangeInfo');
          var symbolInfo = info.symbols.find(function(s) { return s.symbol === SYMBOL; });
          if (!symbolInfo || symbolInfo.status !== 'TRADING') {
                  console.error('ERRO: Simbolo ' + SYMBOL + ' invalido para Futures.');
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
    console.log(' VALIDACAO DE SEGURANCA - FUTURES');
    console.log('==============================================');
    var results = { publicConnection: false, privateConnection: false, symbolValid: false, allPassed: false };

  console.log('Teste 1/3: Conexao com Binance Futures...');
    results.publicConnection = await testPublicConnection();
    if (!results.publicConnection) { console.error('FALHA: Sem conexao.'); return results; }

  console.log('Teste 2/3: Autenticacao da API Futures...');
    if (dryRun && (!API_KEY || API_KEY === 'cole_sua_api_key_aqui')) {
          console.log('DRY RUN sem chaves - pulando autenticacao');
          results.privateConnection = true;
    } else {
          results.privateConnection = await testPrivateConnection();
          if (!results.privateConnection) { console.error('FALHA: Autenticacao invalida.'); return results; }
    }

  console.log('Teste 3/3: Validando simbolo ' + SYMBOL + ' em Futures...');
    results.symbolValid = await testSymbol();
    if (!results.symbolValid) { console.error('FALHA: Simbolo invalido.'); return results; }

  results.allPassed = true;
    console.log('==============================================');
    console.log(' TODOS OS TESTES PASSARAM - Sistema OK');
    console.log('==============================================');
    console.log('');
    return results;
}

module.exports = { testPublicConnection, testPrivateConnection, testSymbol, runFullValidation };
