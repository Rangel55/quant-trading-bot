const axios = require('axios');
const crypto = require('crypto');
const { API_KEY, API_SECRET, BASE_URL } = require('../config/settings');

function sign(queryString) {
    return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
}

const headers = { 'X-MBX-APIKEY': API_KEY };

// GET publico (sem autenticacao)
async function publicGet(endpoint, params) {
    params = params || {};
    const { data } = await axios.get(BASE_URL + endpoint, { params });
    return data;
}

// GET privado (com assinatura HMAC)
async function privateGet(endpoint, params) {
    params = params || {};
    params.timestamp = Date.now();
    const qs = new URLSearchParams(params).toString();
    params.signature = sign(qs);
    const { data } = await axios.get(BASE_URL + endpoint, { params, headers });
    return data;
}

// POST privado (com assinatura HMAC)
async function privatePost(endpoint, params) {
    params = params || {};
    params.timestamp = Date.now();
    const qs = new URLSearchParams(params).toString();
    params.signature = sign(qs);
    const { data } = await axios.post(BASE_URL + endpoint, null, { params, headers });
    return data;
}

// DELETE privado (cancelar ordens)
async function privateDelete(endpoint, params) {
    params = params || {};
    params.timestamp = Date.now();
    const qs = new URLSearchParams(params).toString();
    params.signature = sign(qs);
    const { data } = await axios.delete(BASE_URL + endpoint, { params, headers });
    return data;
}

// Configura alavancagem para um simbolo
async function setLeverage(symbol, leverage) {
    try {
          const result = await privatePost('/fapi/v1/leverage', {
                  symbol: symbol,
                  leverage: leverage,
          });
          console.log('Alavancagem configurada: ' + leverage + 'x em ' + symbol);
          return result;
    } catch (err) {
          console.error('Erro ao configurar alavancagem:', err.message);
          throw err;
    }
}

// Configura tipo de margem (ISOLATED ou CROSSED)
async function setMarginType(symbol, marginType) {
    try {
          await privatePost('/fapi/v1/marginType', {
                  symbol: symbol,
                  marginType: marginType,
          });
          console.log('Margem configurada: ' + marginType + ' em ' + symbol);
    } catch (err) {
          // Ignora erro se margem ja esta configurada corretamente
      if (err.response && err.response.data && err.response.data.code === -4046) {
              console.log('Margem ja configurada como ' + marginType);
      } else {
              throw err;
      }
    }
}

// Valida conexao com Binance Futures
async function validateConnection() {
    try {
          await publicGet('/fapi/v1/ping');
          const t = await publicGet('/fapi/v1/time');
          console.log('Binance Futures OK. Server time: ' + new Date(t.serverTime).toISOString());
          return true;
    } catch (err) {
          console.error('Falha Binance Futures:', err.message);
          return false;
    }
}

module.exports = {
    publicGet,
    privateGet,
    privatePost,
    privateDelete,
    setLeverage,
    setMarginType,
    validateConnection,
};
