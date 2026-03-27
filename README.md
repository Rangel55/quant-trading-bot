# Quant Trading Bot - ByBit Futures

Bot de trading quantitativo para operar **Futuros USDT-Perp** na ByBit, com dashboard web, analise tecnica automatizada e suporte a alavancagem.

## Funcionalidades

- Integracao completa com **ByBit API V5** (Futuros Linear)
- Dashboard web em tempo real
- Scanner automatico de pares com maior volume/volatilidade
- Analise quantitativa: MA, RSI, Order Book, Open Interest
- Execucao de ordens **LONG** e **SHORT** com alavancagem configuravel
- Stop Loss e Take Profit automaticos em cada operacao
- Modo **DRY RUN** (simulado) e **LIVE** (real)
- Registro completo de historico e sessoes

## Requisitos

- Node.js 18+
- Conta ByBit com acesso a Futuros USDT-Perp
- Chaves de API ByBit com permissao de trading

## Instalacao

```bash
git clone https://github.com/Rangel55/quant-trading-bot.git
cd quant-trading-bot
npm install
cp .env.example .env
# Edite o .env com suas chaves ByBit
```

## Configuracao

Edite o arquivo `.env`:

```env
BYBIT_API_KEY=sua_api_key
BYBIT_API_SECRET=seu_api_secret
DRY_RUN=true
LEVERAGE=10
PORT=3000
```

## Uso

```bash
npm start
```

Acesse o dashboard em: **http://localhost:3000**

## Estrutura

```
quant-trading-bot/
├── config/
│   └── settings.js          # Configuracoes gerais (pares, leverage, SL/TP)
├── services/
│   ├── bybit.service.js     # Autenticacao e chamadas ByBit API V5
│   ├── market.service.js    # Dados de mercado (candles, ticker, orderbook)
│   ├── order.service.js     # Execucao de ordens (Long/Short, SL/TP)
│   └── connection.validator.js  # Validacao de conexao
├── controllers/
│   └── trading.controller.js    # Ciclo principal de trading
├── ai/
│   └── analysis.service.js  # Analise quantitativa (MA, RSI, OB)
├── risk/
│   └── risk.manager.js      # Gestao de risco e sizing
├── logs/
│   └── trade.logger.js      # Registro de operacoes
├── public/                  # Dashboard web (HTML/CSS/JS)
├── server.js                # Servidor Express + API REST
└── .env.example             # Exemplo de configuracao
```

## API Endpoints

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | /api/status | Estado atual do bot |
| GET | /api/balance | Saldo USDT na ByBit |
| GET | /api/history | Historico de operacoes |
| GET | /api/sessions | Sessoes anteriores |
| POST | /api/start | Iniciar bot |
| POST | /api/stop | Parar bot |
| POST | /api/settings | Atualizar configuracoes |

## Aviso

Este bot e fornecido apenas para fins educacionais. Operar futuros com alavancagem envolve risco elevado de perda. Use sempre o modo DRY RUN antes de operar com capital real.
