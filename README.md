# 🤖 quant-trading-bot

Bot de trading quantitativo automatizado com integração real à API da Binance.

## 🏗️ Estrutura do Projeto

```
quant-trading-bot/
├── .env.example          # Variáveis de ambiente (modelo)
├── .gitignore            # Arquivos ignorados pelo Git
├── index.js              # Entry point — inicia o bot
├── package.json          # Dependências Node.js
├── config/
│   └── settings.js       # Configurações e constantes
├── services/
│   ├── binance.service.js  # Integração segura com API Binance
│   ├── market.service.js   # Coleta de dados de mercado
│   └── order.service.js    # Execução e validação de ordens
├── ai/
│   └── analysis.service.js # Motor de análise quantitativa
├── controllers/
│   └── trading.controller.js # Orquestrador do fluxo completo
├── risk/
│   └── risk.manager.js     # Gestão de risco e filtros
└── logs/
    └── trade.logger.js     # Registro de operações
```

## ⚙️ Instalação

```bash
git clone https://github.com/Rangel55/quant-trading-bot.git
cd quant-trading-bot
npm install
cp .env.example .env
# Edite o .env com suas chaves de API da Binance
```

## 🚀 Execução

```bash
# Modo simulação (recomendado para testes)
npm run dry

# Modo real (apenas após validação extensiva)
npm run live
```

## 🔐 Segurança das Chaves de API

- ✅ Habilitar apenas: Leitura + Execução de Ordens
- - ❌ NUNCA habilitar: Saques
  - - ✅ Restringir por IP quando possível
    - - ❌ Nunca commitar o arquivo `.env`
     
      - ## 📊 Estratégia Quantitativa
     
      - O bot utiliza **confluência de sinais** para tomar decisões:
     
      - | Sinal | Indicador |
      - |-------|-----------|
      - | Tendência | SMA 9, 21, 200 |
      - | Momentum | RSI 14 |
      - | Estrutura | Swing Highs/Lows |
      - | Pressão | Order Book Ratio |
     
      - **Regra de entrada:** mínimo **3 de 4 sinais alinhados** + volatilidade mínima de 0.3%
     
      - ## 🛡️ Gestão de Risco
     
      - - Máximo **2% do capital** por operação
        - - Máximo **5 trades por dia**
          - - Stop Loss automático em **1.5%**
            - - Take Profit em **3%** (Risk:Reward = 1:2)
             
              - ## 📋 Decisões Possíveis
             
              - O motor de análise retorna exclusivamente:
             
              - ```
                COMPRAR | VENDER | ESPERAR
                ```

                ## ⚠️ Aviso

                Este bot opera com capital real. Teste extensivamente em modo DRY RUN antes de ativar o modo LIVE. O autor não se responsabiliza por perdas financeiras.
                
