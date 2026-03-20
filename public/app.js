var isRunning = false;

function updateClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
}
setInterval(updateClock, 1000);
updateClock();

async function toggleBot() {
    var btn = document.getElementById('toggle-btn');
    if (!isRunning) {
          var mode = document.querySelector('input[name="mode"]:checked').value;
          var capital = document.getElementById('capital').value;
          var leverage = document.getElementById('leverage').value;
          var stopLoss = document.getElementById('stopLoss').value;
          var takeProfit = document.getElementById('takeProfit').value;
          btn.disabled = true;
          btn.textContent = 'Iniciando...';
          try {
                  var res = await fetch('/api/start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mode: mode, capital: capital, leverage: leverage, stopLoss: stopLoss, takeProfit: takeProfit })
                  });
                  var data = await res.json();
                  btn.disabled = false;
                  if (data.success) {
                            isRunning = true;
                            btn.className = 'btn-stop';
                            btn.textContent = 'PARAR BOT';
                            showMsg(data.message, 'green');
                  } else {
                            btn.textContent = 'INICIAR BOT';
                            showMsg(data.message, 'red');
                  }
          } catch(e) {
                  btn.disabled = false;
                  btn.textContent = 'INICIAR BOT';
                  showMsg('Erro ao conectar com o servidor.', 'red');
          }
    } else {
          try {
                  var res = await fetch('/api/stop', { method: 'POST' });
                  var data = await res.json();
                  if (data.success) {
                            isRunning = false;
                            btn.className = 'btn-start';
                            btn.textContent = 'INICIAR BOT';
                            document.getElementById('started-at').textContent = '';
                            showMsg('Bot parado.', 'gray');
                  }
          } catch(e) { showMsg('Erro ao parar o bot.', 'red'); }
    }
}

async function saveSettings() {
    var capital = document.getElementById('capital').value;
    var leverage = document.getElementById('leverage').value;
    var stopLoss = document.getElementById('stopLoss').value;
    var takeProfit = document.getElementById('takeProfit').value;
    try {
          var res = await fetch('/api/settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ capital: capital, leverage: leverage, stopLoss: stopLoss, takeProfit: takeProfit })
          });
          var data = await res.json();
          showMsg(data.message, 'green');
          updateBalanceDisplay(parseFloat(capital), parseInt(leverage));
    } catch(e) { showMsg('Erro ao salvar.', 'red'); }
}

function updateBalanceDisplay(capital, leverage) {
    document.getElementById('capital-configured').textContent = '$ ' + parseFloat(capital).toFixed(2);
    document.getElementById('leverage-display').textContent = leverage + ' x';
    var buyingPower = parseFloat(capital) * parseInt(leverage);
    document.getElementById('buying-power').textContent = '$ ' + buyingPower.toFixed(2);
}

async function refreshStatus() {
    try {
          var res = await fetch('/api/status');
          var data = await res.json();
          isRunning = data.running;
          var btn = document.getElementById('toggle-btn');
          var badge = document.getElementById('status-badge');

      if (data.running) {
              btn.className = 'btn-stop';
              btn.textContent = 'PARAR BOT';
              badge.className = data.mode === 'LIVE' ? 'badge badge-live' : 'badge badge-on';
              badge.textContent = data.mode === 'LIVE' ? 'LIVE' : 'RODANDO';
              if (data.startedAt) {
                        document.getElementById('started-at').textContent = 'Iniciado: ' + new Date(data.startedAt).toLocaleTimeString('pt-BR');
              }
      } else {
              btn.className = 'btn-start';
              btn.textContent = 'INICIAR BOT';
              badge.className = 'badge badge-off';
              badge.textContent = 'PARADO';
      }

      if (data.currentSymbol) document.getElementById('current-symbol').textContent = data.currentSymbol;

      // Saldo futures
      if (data.balance !== undefined) {
              document.getElementById('balance-value').textContent = '$ ' + parseFloat(data.balance).toFixed(2);
      }

      // Capital e alavancagem
      updateBalanceDisplay(data.capital || 20, data.leverage || 5);

      if (data.stats) {
              document.getElementById('stat-total').textContent = data.stats.total || 0;
              document.getElementById('stat-executed').textContent = data.stats.executed || 0;
              document.getElementById('stat-dry').textContent = data.stats.dryRun || 0;
              document.getElementById('stat-wait').textContent = data.stats.esperar || 0;
      }
    } catch(e) {}
}

async function refreshHistory() {
    try {
          var res = await fetch('/api/history');
          var trades = await res.json();
          var tbody = document.getElementById('history-body');
          if (!trades || trades.length === 0) {
                  tbody.innerHTML = '<tr><td colspan="8" class="empty">Nenhuma operacao ainda.</td></tr>';
                  return;
          }
          tbody.innerHTML = trades.map(function(t) {
                  var hora = t.timestamp ? new Date(t.timestamp).toLocaleTimeString('pt-BR') : '--';
                  var symbol = t.symbol || '--';
                  var dec = t.decision || '--';
feat(dashboard): public/app.js - saldo futures, capital, alavancagem e poder de compra em tempo real                  var preco = t.price ? parseFloat(t.price).toFixed(4) : '--';
                  var qty = t.qty !== undefined ? t.qty : '--';
                  var sl = t.levels && t.levels.stopLoss ? parseFloat(t.levels.stopLoss).toFixed(4) : '--';
                  var tp = t.levels && t.levels.takeProfit ? parseFloat(t.levels.takeProfit).toFixed(4) : '--';
                  var modo = t.mode || '--';
                  var modoClass = modo === 'LIVE_FUTURES' ? 'tag tag-live' : 'tag tag-dry';
                  return '<tr><td>' + hora + '</td><td>' + symbol + '</td><td><span class="' + decClass + '">' + dec + '</span></td><td>' + preco + '</td><td>' + qty + '</td><td>' + sl + '</td><td>' + tp + '</td><td><span class="' + modoClass + '">' + modo + '</span></td></tr>';
          }).join('');
    } catch(e) {}
}

function showMsg(msg, color) {
    var el = document.getElementById('settings-msg');
    el.style.color = color === 'red' ? '#f78166' : color === 'green' ? '#3fb950' : '#8b949e';
    el.textContent = msg;
    setTimeout(function() { el.textContent = ''; el.style.color = ''; }, 4000);
}

setInterval(refreshStatus, 5000);
setInterval(refreshHistory, 5000);
refreshStatus();
refreshHistory();
