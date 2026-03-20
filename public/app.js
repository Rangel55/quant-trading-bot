var isRunning = false;

function updateClock() {
        document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
}
setInterval(updateClock, 1000);
updateClock();

function toggleBot() {
        var btn = document.getElementById('toggle-btn');
        if (!isRunning) {
                  var mode = document.querySelector('input[name="mode"]:checked').value;
                  var capital = document.getElementById('capital').value;
                  var leverage = document.getElementById('leverage').value;
                  var stopLoss = document.getElementById('stopLoss').value;
                  var takeProfit = document.getElementById('takeProfit').value;
                  btn.disabled = true;
                  btn.textContent = 'Iniciando...';
                  fetch('/api/start', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mode: mode, capital: capital, leverage: leverage, stopLoss: stopLoss, takeProfit: takeProfit })
                  })
                  .then(function(res) { return res.json(); })
                  .then(function(data) {
                              btn.disabled = false;
                              if (data.success) {
                                            isRunning = true;
                                            btn.className = 'btn-stop';
                                            btn.textContent = 'PARAR BOT';
                                            showMsg(data.message, 'green');
                                            refreshBalance();
                              } else {
                                            btn.textContent = 'INICIAR BOT';
                                            showMsg(data.message, 'red');
                              }
                  })
                  .catch(function() {
                              btn.disabled = false;
                              btn.textContent = 'INICIAR BOT';
                              showMsg('Erro ao conectar com o servidor.', 'red');
                  });
        } else {
                  fetch('/api/stop', { method: 'POST' })
                  .then(function(res) { return res.json(); })
                  .then(function(data) {
                              if (data.success) {
                                            isRunning = false;
                                            btn.className = 'btn-start';
                                            btn.textContent = 'INICIAR BOT';
                                            document.getElementById('started-at').textContent = '';
                                            showMsg('Bot parado.', 'gray');
                                            refreshSessions();
                                            refreshBalance();
                              }
                  })
                  .catch(function() {
                              showMsg('Erro ao parar o bot.', 'red');
                  });
        }
}

function saveSettings() {
        var capital = document.getElementById('capital').value;
        var leverage = document.getElementById('leverage').value;
        var stopLoss = document.getElementById('stopLoss').value;
        var takeProfit = document.getElementById('takeProfit').value;
        fetch('/api/settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ capital: capital, leverage: leverage, stopLoss: stopLoss, takeProfit: takeProfit })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
                  showMsg(data.message, 'green');
                  updateBalanceDisplay(parseFloat(capital), parseInt(leverage));
        })
        .catch(function() {
                  showMsg('Erro ao salvar.', 'red');
        });
}

function updateBalanceDisplay(capital, leverage) {
        var capEl = document.getElementById('capital-configured');
        var levEl = document.getElementById('leverage-display');
        var bpEl = document.getElementById('buying-power');
        if (capEl) capEl.textContent = '$ ' + parseFloat(capital).toFixed(2);
        if (levEl) levEl.textContent = leverage + ' x';
        if (bpEl) bpEl.textContent = '$ ' + (parseFloat(capital) * parseInt(leverage)).toFixed(2);
}

function refreshBalance() {
        fetch('/api/balance')
        .then(function(res) { return res.json(); })
        .then(function(data) {
                  var balEl = document.getElementById('balance-value');
                  if (balEl) {
                              balEl.textContent = data.success ? '$ ' + parseFloat(data.balance).toFixed(2) : '$ --';
                  }
        })
        .catch(function() {});
}

function refreshStatus() {
        fetch('/api/status')
        .then(function(res) { return res.json(); })
        .then(function(data) {
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
                  var symEl = document.getElementById('current-symbol');
                  if (symEl && data.currentSymbol) symEl.textContent = data.currentSymbol;
                  updateBalanceDisplay(data.capital || 20, data.leverage || 5);
                  if (data.stats) {
                              document.getElementById('stat-total').textContent = data.stats.total || 0;
                              document.getElementById('stat-executed').textContent = data.stats.executed || 0;
                              document.getElementById('stat-dry').textContent = data.stats.dryRun || 0;
                              document.getElementById('stat-wait').textContent = data.stats.esperar || 0;
                  }
        })
        .catch(function() {});
}

function refreshSessions() {
        fetch('/api/sessions')
        .then(function(res) { return res.json(); })
        .then(function(sessions) {
                  var tbody = document.getElementById('sessions-body');
                  if (!sessions || sessions.length === 0) {
                              tbody.innerHTML = '<tr><td colspan="9" class="empty">Nenhuma sessao ainda.</td></tr>';
                              return;
                  }
                  tbody.innerHTML = sessions.map(function(s) {
                              var inicio = s.startedAt ? new Date(s.startedAt).toLocaleString('pt-BR') : '--';
                              var duracao = s.durationMin !== undefined ? s.durationMin + ' min' : '--';
                              var capital = s.capital !== undefined ? '$ ' + parseFloat(s.capital).toFixed(2) : '--';
                              var saldoIni = s.balanceAtStart !== undefined ? '$ ' + parseFloat(s.balanceAtStart).toFixed(2) : '--';
                              var saldoFim = s.balanceAtEnd !== undefined ? '$ ' + parseFloat(s.balanceAtEnd).toFixed(2) : '--';
                              var profit = s.profit !== undefined ? s.profit : 0;
                              var profitPct = s.profitPercent !== undefined ? s.profitPercent : 0;
                              var profitClass = profit >= 0 ? 'tag tag-buy' : 'tag tag-sell';
                              var profitStr = (profit >= 0 ? '+' : '') + profit.toFixed(4) + ' (' + (profitPct >= 0 ? '+' : '') + profitPct.toFixed(2) + '%)';
                              var modoClass = s.mode === 'LIVE' ? 'tag tag-live' : 'tag tag-dry';
                              return '<tr>'
                                + '<td>' + (s.id || '--') + '</td>'
                                + '<td><span class="' + modoClass + '">' + (s.mode || '--') + '</span></td>'
                                + '<td>' + inicio + '</td>'
                                + '<td>' + duracao + '</td>'
                                + '<td>' + capital + '</td>'
                                + '<td>' + saldoIni + '</td>'
                                + '<td>' + saldoFim + '</td>'
                                + '<td><span class="' + profitClass + '">' + profitStr + '</span></td>'
                                + '<td>' + (s.totalCycles || 0) + '</td>'
                                + '</tr>';
                  }).join('');
        })
        .catch(function() {});
}

function refreshHistory() {
        fetch('/api/history')
        .then(function(res) { return res.json(); })
        .then(function(trades) {
                  var tbody = document.getElementById('history-body');
                  if (!trades || trades.length === 0) {
                              tbody.innerHTML = '<tr><td colspan="8" class="empty">Nenhuma operacao ainda.</td></tr>';
                              return;
                  }
                  tbody.innerHTML = trades.map(function(t) {
                              var hora = t.timestamp ? new Date(t.timestamp).toLocaleTimeString('pt-BR') : '--';
                              var symbol = t.symbol || '--';
                              var dec = t.decision || '--';
                              var decClass = dec === 'COMPRAR' ? 'tag tag-buy' : dec === 'VENDER' ? 'tag tag-sell' : 'tag tag-wait';
                              var preco = t.price ? parseFloat(t.price).toFixed(4) : '--';
                              var qty = t.qty !== undefined ? t.qty : '--';
                              var sl = t.levels && t.levels.stopLoss ? parseFloat(t.levels.stopLoss).toFixed(4) : '--';
                              var tp = t.levels && t.levels.takeProfit ? parseFloat(t.levels.takeProfit).toFixed(4) : '--';
                              var modo = t.mode || '--';
                              var modoClass = modo === 'LIVE_FUTURES' ? 'tag tag-live' : 'tag tag-dry';
                              return '<tr><td>' + hora + '</td><td>' + symbol + '</td><td><span class="' + decClass + '">' + dec + '</span></td><td>' + preco + '</td><td>' + qty + '</td><td>' + sl + '</td><td>' + tp + '</td><td><span class="' + modoClass + '">' + modo + '</span></td></tr>';
                  }).join('');
        })
        .catch(function() {});
}

function showMsg(msg, color) {
        var el = document.getElementById('settings-msg');
        if (!el) return;
        el.style.color = color === 'red' ? '#f78166' : color === 'green' ? '#3fb950' : '#8b949e';
        el.textContent = msg;
        setTimeout(function() { el.textContent = ''; el.style.color = ''; }, 4000);
}

setInterval(refreshStatus, 5000);
setInterval(refreshHistory, 5000);
setInterval(refreshBalance, 30000);
refreshStatus();
refreshHistory();
refreshBalance();
refreshSessions();
