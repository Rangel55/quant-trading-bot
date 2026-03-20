const axios  = require('axios');
const crypto = require('crypto');
const { API_KEY, API_SECRET, BASE_URL } = require('../config/settings');

function sign(queryString) {
  return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
}

const headers = { 'X-MBX-APIKEY': API_KEY };

async function publicGet(endpoint, params = {}) {
  const { data } = await axios.get(BASE_URL + endpoint, { params });
  return data;
}

async function privateGet(endpoint, params = {}) {
  params.timestamp = Date.now();
  const qs = new URLSearchParams(params).toString();
  params.signature = sign(qs);
  const { data } = await axios.get(BASE_URL + endpoint, { params, headers });
  return data;
}

async function privatePost(endpoint, params = {}) {
  params.timestamp = Date.now();
  const qs = new URLSearchParams(params).toString();
  params.signature = sign(qs);
  const { data } = await axios.post(BASE_URL + endpoint, null, { params, headers });
  return data;
}

async function validateConnection() {
  try {
    await publicGet('/api/v3/ping');
    const t = await publicGet('/api/v3/time');
    console.log('Binance OK. Server time: ' + new Date(t.serverTime).toISOString());
    return true;
  } catch (err) {
    console.error('Falha Binance:', err.message);
    return false;
  }
}

module.exports = { publicGet, privateGet, privatePost, validateConnection };
