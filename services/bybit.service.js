const axios = require('axios');
const crypto = require('crypto');
const { BYBIT_API_KEY, BYBIT_API_SECRET, BYBIT_BASE_URL } = require('../config/settings');

const http = axios.create({ timeout: 10000 });

function sign(timestamp, params) {
  const paramStr = timestamp + BYBIT_API_KEY + '5000' + params;
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(paramStr).digest('hex');
}

function buildHeaders(timestamp, signature) {
  return {
    'X-BAPI-API-KEY': BYBIT_API_KEY,
    'X-BAPI-TIMESTAMP': timestamp.toString(),
    'X-BAPI-RECV-WINDOW': '5000',
    'X-BAPI-SIGN': signature,
    'Content-Type': 'application/json',
  };
}

async function withRetry(fn, tentativas) {
  tentativas = tentativas || 3;
  for (var i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === tentativas - 1) throw err;
      console.warn('[RETRY] Tentativa ' + (i + 1) + ' falhou: ' + err.message + '. Tentando em 2s...');
      await new Promise(function(r) { setTimeout(r, 2000); });
    }
  }
}

async function publicGet(endpoint, params) {
  params = params || {};
  const qs = new URLSearchParams(params).toString();
  return withRetry(function() {
    return http.get(BYBIT_BASE_URL + endpoint + (qs ? '?' + qs : ''))
      .then(function(r) {
        if (r.data.retCode !== undefined && r.data.retCode !== 0)
          throw new Error('ByBit [' + r.data.retCode + ']: ' + r.data.retMsg);
        return r.data;
      });
  });
}

async function privateGet(endpoint, params) {
  params = params || {};
  const timestamp = Date.now();
  const qs = new URLSearchParams(params).toString();
  const signature = sign(timestamp, qs);
  const headers = buildHeaders(timestamp, signature);
  return withRetry(function() {
    return http.get(BYBIT_BASE_URL + endpoint + (qs ? '?' + qs : ''), { headers })
      .then(function(r) {
        if (r.data.retCode !== undefined && r.data.retCode !== 0)
          throw new Error('ByBit [' + r.data.retCode + ']: ' + r.data.retMsg);
        return r.data;
      });
  });
}

async function privatePost(endpoint, body) {
  body = body || {};
  const timestamp = Date.now();
  const bodyStr = JSON.stringify(body);
  const signature = sign(timestamp, bodyStr);
  const headers = buildHeaders(timestamp, signature);
  return withRetry(function() {
    return http.post(BYBIT_BASE_URL + endpoint, body, { headers })
      .then(function(r) {
        if (r.data.retCode !== undefined && r.data.retCode !== 0)
          throw new Error('ByBit [' + r.data.retCode + ']: ' + r.data.retMsg);
        return r.data;
      });
  });
}

async function validateConnection() {
  try {
    const t = await publicGet('/v5/market/time');
    console.log('ByBit Futures OK. Server time: ' + new Date(parseInt(t.result.timeSecond) * 1000).toISOString());
    return true;
  } catch (err) {
    console.error('Falha ByBit Futures:', err.message);
    return false;
  }
}

module.exports = { publicGet, privateGet, privatePost, validateConnection };
