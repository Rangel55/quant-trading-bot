const axios = require('axios');
const crypto = require('crypto');
const { API_KEY, API_SECRET, BASE_URL } = require('../config/settings');

// Instancia axios com timeout de 10s
const http = axios.create({ timeout: 10000 });

function sign(queryString) {
          return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
}

const headers = { 'X-MBX-APIKEY': API_KEY };

// Retry automatico: tenta ate 3 vezes com 2s de espera
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

// GET publico (sem autenticacao) - Spot
async function publicGet(endpoint, params) {
          params = params || {};
          return withRetry(function() {
                      return http.get(BASE_URL + endpoint, { params }).then(function(r) { return r.data; });
          });
}

// GET privado (com assinatura HMAC) - Spot
async function privateGet(endpoint, params) {
          params = params || {};
          params.timestamp = Date.now();
          var qs = new URLSearchParams(params).toString();
          params.signature = sign(qs);
          return withRetry(function() {
                      return http.get(BASE_URL + endpoint, { params, headers }).then(function(r) { return r.data; });
          });
}

// POST privado (com assinatura HMAC) - Spot
async function privatePost(endpoint, params) {
          params = params || {};
          params.timestamp = Date.now();
          var qs = new URLSearchParams(params).toString();
          params.signature = sign(qs);
          return withRetry(function() {
                      return http.post(BASE_URL + endpoint, null, { params, headers }).then(function(r) { return r.data; });
          });
}

// DELETE privado (cancelar ordens) - Spot
async function privateDelete(endpoint, params) {
          params = params || {};
          params.timestamp = Date.now();
          var qs = new URLSearchParams(params).toString();
          params.signature = sign(qs);
          return withRetry(function() {
                      return http.delete(BASE_URL + endpoint, { params, headers }).then(function(r) { return r.data; });
          });
}

// Valida conexao com Binance Spot
async function validateConnection() {
          try {
                      await publicGet('/api/v3/ping');
                      const t = await publicGet('/api/v3/time');
                      console.log('Binance Spot OK. Server time: ' + new Date(t.serverTime).toISOString());
                      return true;
          } catch (err) {
                      console.error('Falha Binance Spot:', err.message);
                      return false;
          }
}

module.exports = { publicGet, privateGet, privatePost, privateDelete, validateConnection };
