// ETAPA 2: Validador de Conexao e Seguranca da API Binance
// Garante que todas as condicoes de seguranca sao atendidas
// antes de qualquer operacao real.

const { publicGet, privateGet } = require('./binance.service');
const { API_KEY, API_SECRET, SYMBOL } = require('../config/settings');

// Valida conexao basica com a Binance (sem autenticacao)
async function testPublicConnection() {
  try {
    await publicGet('/api/v3/ping');
    const timeData = await publicGet('/api/v3/time');
    const diff = Math.abs(Date.now() - timeData.serverTime);
    if (diff > 5000) {
      console.warn('AVISO: Diferenca de horario com servidor Binance: ' + diff + 'ms');
      console.warn('Isso pode causar erros de assinatura. Sincronize o relogio do sistema.');
    }
    console.log('Conexao publica OK | Server time: ' + new Date(timeData.serverTime).toISOString());
    return true;
  } catch (err) {
    console.error('ERRO na conexao publica: ' + err.message);
    return false;
  }
}

// Valida autenticacao com a Binance (com API Key/Secret)
async function testPrivateConnection() {
  if (!API_KEY || API_KEY === 'cole_sua_api_key_aqui' || API_KEY === '') {
    console.error('ERRO: BINANCE_API_KEY nao configurada no arquivo .env');
    return false;
  }
  if (!API_SECRET || API_SECRET === 'cole_seu_api_secret_aqui' || API_SECRET === '') {
    console.error('ERRO: BINANCE_API_SECRET nao configurada no arquivo .env');
    return false;
  }
  try {
    const account = await privateGet('/api/v3/account');
    const usdtBalance = account.balances.find(function(b) { return b.asset === 'USDT'; });
    const balance = usdtBalance ? parseFloat(usdtBalance.free) : 0;
    console.log('Autenticacao OK | Saldo USDT disponivel: $' + balance.toFixed(2));

    // Verifica permissoes da conta
    if (!account.canTrade) {
      console.error('ERRO: Esta conta nao tem permissao para negociar!');
      return false;
    }
    console.log('Permissoes OK | canTrade: ' + account.canTrade + ' | canDeposit: ' + account.canDeposit);
    return true;
  } catch (err) {
    if (err.response && err.response.data) {
      var code = err.response.data.code;
      var msg  = err.response.data.msg;
      if (code === -2015) {
        console.error('ERRO DE AUTENTICACAO: API Key invalida ou sem permissoes.');
        console.error('Verifique se copiou a chave corretamente e as permissoes estao corretas.');
      } else if (code === -1021) {
        console.error('ERRO DE TIMESTAMP: Relogio do sistema desincronizado com a Binance.');
        console.error('Execute: sudo ntpdate pool.ntp.org');
      } else {
        console.error('ERRO Binance [' + code + ']: ' + msg);
      }
    } else {
      console.error('ERRO na autenticacao: ' + err.message);
    }
    return false;
  }
}

// Valida se o simbolo configurado existe e esta ativo
async function testSymbol() {
  try {
    const info = await publicGet('/api/v3/exchangeInfo', { symbol: SYMBOL });
    var symbolInfo = info.symbols.find(function(s) { return s.symbol === SYMBOL; });
    if (!symbolInfo) {
      console.error('ERRO: Simbolo ' + SYMBOL + ' nao encontrado na Binance.');
      return false;
    }
    if (symbolInfo.status !== 'TRADING') {
      console.error('ERRO: Simbolo ' + SYMBOL + ' nao esta em status TRADING (status: ' + symbolInfo.status + ')');
      return false;
    }
    console.log('Simbolo OK | ' + SYMBOL + ' | Status: ' + symbolInfo.status);
    return true;
  } catch (err) {
    console.error('ERRO ao validar simbolo: ' + err.message);
    return false;
  }
}

// VALIDACAO COMPLETA - executa todos os testes de seguranca
async function runFullValidation(dryRun) {
  console.log('');
  console.log('==============================================');
  console.log('  VALIDACAO DE SEGURANCA - ETAPA 2');
  console.log('==============================================');

  var results = {
    publicConnection: false,
    privateConnection: false,
    symbolValid:      false,
    allPassed:        false,
  };

  // Teste 1: Conexao publica
  console.log('Teste 1/3: Conexao com Binance...');
  results.publicConnection = await testPublicConnection();
  if (!results.publicConnection) {
    console.error('FALHA: Sem conexao com a Binance. Verifique sua internet.');
    return results;
  }

  // Teste 2: Autenticacao privada (apenas se nao for dry run sem chaves)
  console.log('Teste 2/3: Autenticacao da API...');
  if (dryRun && (!API_KEY || API_KEY === 'cole_sua_api_key_aqui')) {
    console.log('DRY RUN sem chaves configuradas - pulando autenticacao privada');
    results.privateConnection = true;
  } else {
    results.privateConnection = await testPrivateConnection();
    if (!results.privateConnection) {
      console.error('FALHA: Autenticacao invalida. Verifique suas chaves no .env');
      return results;
    }
  }

  // Teste 3: Simbolo de trading
  console.log('Teste 3/3: Validando simbolo ' + SYMBOL + '...');
  results.symbolValid = await testSymbol();
  if (!results.symbolValid) {
    console.error('FALHA: Simbolo invalido. Verifique SYMBOL no .env');
    return results;
  }

  results.allPassed = true;
  console.log('==============================================');
  console.log('  TODOS OS TESTES PASSARAM - Sistema OK');
  console.log('==============================================');
  console.log('');
  return results;
}

module.exports = { testPublicConnection, testPrivateConnection, testSymbol, runFullValidation };
