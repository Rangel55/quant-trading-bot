# Seguranca da API Binance - Guia Completo

## Etapa 2: Configuracao Segura da Integracao com a Binance

Este documento descreve como criar e configurar as chaves de API da Binance
com o maximo de seguranca para uso com o bot de trading quantitativo.

---

## Por que a seguranca da API e critica?

As chaves de API dao acesso direto a sua conta na Binance. Se vazadas,
um atacante pode:
- Executar ordens em seu nome
- Drenar seu saldo via saques (se a permissao estiver habilitada)
- Manipular sua carteira

Por isso, seguimos as regras mais rigidas possiveis.

---

## Passo a Passo: Criando a API Key na Binance

### 1. Acesse o Gerenciamento de API
- Faca login em binance.com
- Va em: Perfil > Gerenciamento de API
- Ou acesse diretamente: binance.com/en/my/settings/api-management

### 2. Crie uma nova chave
- Clique em "Create API"
- Escolha o tipo: "System generated"
- De um nome descritivo, ex: "quant-trading-bot"
- Complete a verificacao de seguranca (2FA obrigatorio)

### 3. Configure as permissoes CORRETAMENTE

PERMISSOES QUE DEVEM ESTAR ATIVAS:
  [x] Enable Reading
      - Permite leitura de dados de conta, saldo e historico
      - OBRIGATORIO para o bot funcionar

  [x] Enable Spot & Margin Trading
      - Permite execucao de ordens de compra e venda
      - OBRIGATORIO para execucao de ordens

PERMISSOES QUE DEVEM ESTAR DESATIVADAS (NUNCA habilitar):
  [ ] Enable Withdrawals
      - PERIGO MAXIMO: permite sacar seus fundos para qualquer endereco
      - O bot NAO precisa desta permissao
      - Mantenha SEMPRE desativado

  [ ] Enable Futures
      - Nao utilizado neste bot
      - Mantenha desativado

  [ ] Enable Margin
      - Nao utilizado neste bot
      - Mantenha desativado

  [ ] Enable Options
      - Nao utilizado neste bot
      - Mantenha desativado

### 4. Configure a Restricao de IP (FORTEMENTE RECOMENDADO)

Esta e a camada de seguranca mais importante apos as permissoes.

Opcao recomendada: "Restrict access to trusted IPs only"

Como configurar:
  a) Na tela de criacao da API, selecione esta opcao
  b) Adicione o IP do servidor onde o bot vai rodar
     - Para VPS/servidor fixo: adicione o IP estatico do servidor
     - Para uso local: adicione seu IP publico (veja em: meuip.com.br)
  c) Adicione um IP por vez, confirmando cada um

Por que isso e importante:
  - Mesmo que sua API Key seja vazada, ela so pode ser usada
    a partir dos IPs autorizados
  - E a defesa mais eficaz contra roubo de chaves

Como descobrir seu IP:
  curl ifconfig.me
  ou acesse: meuip.com.br

### 5. Salve suas chaves com seguranca

Apos criar a API, a Binance mostrara:
  - API Key (publica): identificador da sua chave
  - Secret Key (privada): EXIBIDA UMA UNICA VEZ - salve imediatamente

Onde guardar:
  - Copie para o arquivo .env local (nunca commite este arquivo)
  - Use um gerenciador de senhas (ex: Bitwarden, 1Password)
  - Nunca salve em arquivos de texto nao criptografados

---

## Regras de Ouro da Seguranca

1. NUNCA habilite saques na API
2. SEMPRE restrinja por IP quando possivel
3. NUNCA commite o arquivo .env no Git
4. NUNCA compartilhe sua Secret Key com ninguem
5. NUNCA a exiba em telas, capturas de tela ou logs
6. ROTACIONE as chaves periodicamente (recomendado: a cada 90 dias)
7. MONITORE o historico de ordens para detectar atividade suspeita
8. Se suspeitar de vazamento: DESATIVE a API imediatamente na Binance

---

## Validacao de Conexao no Bot

Antes de qualquer operacao real, o bot valida a conexao com a Binance:

  1. Testa o endpoint /api/v3/ping (conexao basica)
  2. Verifica o horario do servidor (/api/v3/time)
  3. So prossegue se ambas as validacoes passarem
  4. Em caso de falha: aborta imediatamente com mensagem de erro

Esta logica esta implementada em:
  services/binance.service.js -> funcao validateConnection()

---

## Checklist de Seguranca (revise antes de ir para LIVE)

  [ ] API Key criada com nome descritivo
  [ ] Enable Reading: ATIVO
  [ ] Enable Spot & Margin Trading: ATIVO
  [ ] Enable Withdrawals: DESATIVADO
  [ ] Restricao de IP configurada
  [ ] Arquivo .env criado localmente (nao commitado)
  [ ] Secret Key salva em gerenciador de senhas
  [ ] Testado em DRY_RUN por pelo menos 2 semanas
  [ ] Capital inicial definido (recomendado: comece com pouco)
  [ ] Stop loss configurado (padrao: 1.5%)

---

## Em caso de emergencia

Se voce suspeitar que sua API Key foi comprometida:

1. Acesse imediatamente: binance.com/en/my/settings/api-management
2. Clique em "Delete" na API comprometida
3. Verifique o historico de ordens por atividade nao autorizada
4. Gere uma nova API Key com configuracoes ainda mais restritivas
5. Atualize o arquivo .env com as novas chaves

---

*Ultima atualizacao: Etapa 2 do sistema quant-trading-bot*
