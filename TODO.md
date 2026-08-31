# TODO — forja

Backlog de melhorias e mudanças futuras do projeto. Cada seção é uma frente de trabalho; vamos riscando os itens conforme forem implementados.

---

## 1. Migrar autenticação de sessão de servidor para JWT

**Por quê:** hoje a auth usa `express-session` + `memorystore` (sessão guardada na RAM do processo Node — ver `backend/middleware/session.js`). O Render (free tier) hiberna o backend depois de ~15min sem uso; quando volta, é um processo novo com a memória zerada, ou seja, todas as sessões ativas são perdidas — mesmo o cookie tendo `maxAge` de 7 dias. É por isso que precisa logar de novo todo dia no iPhone. JWT resolve isso na raiz porque o token é autocontido (não depende de nada guardado no servidor).

**Decisão de transporte (definir antes de começar):** manter o token num **cookie httpOnly** (em vez de `localStorage` + header `Authorization`). Motivo: o app já usa `credentials: 'include'` + CORS com `credentials: true` em tudo (`src/services/api.js`, `backend/server.js`), então a troca fica quase transparente pro frontend — só muda o que tem *dentro* do cookie (token assinado em vez de id de sessão em memória). `localStorage` exigiria mudar o `apiFetch` inteiro pra anexar header em toda chamada, e fica exposto a roubo via XSS.

**Trade-off a decidir:** sessão de servidor hoje revalida no banco a cada request (`requireAuth` faz `SELECT ... WHERE id = ? AND ativo = 1`), então desativar um usuário (`ativo = 0`) derruba o acesso dele na hora. Com JWT 100% stateless isso se perde — o token continua válido até expirar mesmo se o usuário for desativado. Recomendo manter essa consulta ao banco a cada request mesmo com JWT (perde um pouco da "pureza" stateless, mas preserva a revogação imediata, que é um comportamento de segurança que já existe hoje e não devíamos regredir).

### Passos

- [x] Adicionar dependência `jsonwebtoken` no `package.json`
- [x] Definir `JWT_SECRET` como variável de ambiente (gerar um secret forte novo — não reaproveitar o `SESSION_SECRET` hardcoded que existe hoje como fallback) e configurar no `.env` local e no painel do Render
- [x] Criar util de assinar/verificar token (`backend/utils/jwt.js`) com payload mínimo (`userId`, `username`) e expiração de 7 dias (igual ao `maxAge` atual)
- [x] `backend/routes/auth.js` — `POST /login`: em vez de `req.session.userId = ...`, assinar o JWT e setar via `res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'none', maxAge: ... })`
- [x] `backend/routes/auth.js` — `POST /logout`: trocar `req.session.destroy()` por `res.clearCookie('token', ...)`
- [x] `backend/routes/auth.js` — `GET /status`: não precisou mexer, a rota só lê `req.user`, quem monta isso é o middleware (item abaixo)
- [x] Adicionar `cookie-parser` (dependência que faltava no plano original — sem ela `req.cookies` não existe, e o middleware de auth precisa ler o cookie `token`)
- [x] `backend/middleware/auth.js` — reescrever `requireAuth` e `checkAuth` pra verificar o JWT do cookie (com `jwt.verify`) em vez de `req.session.userId`, mantendo a consulta `usuarios WHERE id = ? AND ativo = 1` (ver trade-off acima)
- [x] `backend/server.js` — remover o `sessionMiddleware` (não precisa mais de `express-session`/`memorystore`)
- [x] Remover dependências `express-session` e `memorystore` do `package.json` depois que tudo estiver migrado e testado
- [ ] Testar fluxo completo: login → navegar entre telas → forçar restart do Render → confirmar que continua autenticado sem precisar logar de novo
- [x] Testar especificamente no iPhone — funcionou depois de descobrir e corrigir o gotcha abaixo
- [ ] Testar cenário de usuário desativado (`ativo = 0`) — confirmar que ainda derruba o acesso na próxima request, não só no próximo login

**Gotcha descoberto durante o teste no iPhone:** o cookie com o JWT não persistia no app "Adicionado à Tela de Início" (falhava em minutos, não por expiração). Causa: frontend (`tiagogdella.github.io`) e backend (`onrender.com`) são domínios diferentes, então o `Set-Cookie` do backend é um cookie *cross-site* do ponto de vista do Safari — e o iOS (Intelligent Tracking Prevention) bloqueia/restringe isso agressivamente, ainda mais dentro do contexto standalone de um web app na tela de início. Fix aplicado: acessar o app pela própria URL do Render (que já serve o frontend estático via `express.static("docs")`) em vez da URL do GitHub Pages — isso torna o cookie first-party (mesmo domínio) e a restrição do Safari deixa de se aplicar. **Consequência prática: o link "oficial" do app agora é a URL do Render, não mais o GitHub Pages.**

---

## 2. Tela de registro (self-service signup)

**Por quê:** hoje, todo usuário novo (ex: o Ramon) precisa ser criado na mão via `npm run create-user` (CLI interativa, só eu consigo rodar porque só eu tenho acesso ao `.env`/Turso). A ideia é ter uma tela de "criar conta" no próprio app, pra ele não depender de mim toda vez.

**Decidido:** registro aberto, sem código de convite nem trava nenhuma — qualquer um com o link consegue criar conta.

**Decidido:** auto-login — ao criar a conta, a rota já assina o JWT e emite o cookie na hora, sem precisar passar pela tela de login em seguida.

### Passos

- [x] Definir as regras de validação (reaproveitar as que já existem no `createUser.js`: username único com 3+ caracteres, senha 6+ caracteres)
- [x] Criar rota `POST /api/auth/register` em `backend/routes/auth.js`: valida, confere unicidade (`COLLATE NOCASE`), faz hash da senha com `bcrypt` (igual ao `createUser.js` e ao login), insere em `usuarios`, e já emite o cookie JWT (auto-login)
- [x] Criar `src/views/RegisterView.vue`: campos usuário, nome completo (opcional), senha, confirmar senha — com validação no frontend também (senha == confirmar senha, tamanhos mínimos) antes de bater na API
- [x] Adicionar rota `/registro` em `src/router/index.js`
- [x] Adicionar link "Criar conta" na `LoginView.vue`, e um link de volta ("Já tenho conta") na tela de registro
- [x] Testar localmente: username curto/senha curta rejeitados, duplicado (inclusive ignorando maiúsculas) rejeitado com 409, criação bem-sucedida emite cookie JWT correto
- [ ] Testar em produção pelo navegador (o teste local cobriu a API, falta o fluxo completo pela `RegisterView.vue` de verdade)
- [x] ~~Recriar o usuário do Ramon~~ — já existe, como `ramondino` (id 5, criado 07/jul pela CLI). O "ramon" criado/apagado durante teste era outro, sem relação
- [ ] (opcional, não bloqueante) Considerar rate limit básico na rota de registro, já que fica exposta publicamente sem nenhuma trava hoje

---

## 3. Reorganizar arquitetura (controllers / services / repositories)

**Por quê:** hoje quase tudo (treinos, execuções, evolução) mora direto em `backend/server.js` — 486 linhas misturando rota HTTP, validação, autorização e SQL no mesmo lugar. Só `auth` foi separado em `routes/auth.js`, e mesmo assim sem services/repositories próprios. Isso já dificulta achar coisa hoje, e vai ficar pior a cada feature nova — principalmente a que está no radar (ver contexto futuro abaixo).

### Contexto futuro — modelo coach/aluno (não implementar agora, só entender o porquê das decisões abaixo)

Possível mudança de direção do produto: em vez de cada usuário ser dono só dos próprios treinos, existem **dois papéis**:

- **Coach** (admin): cria treinos e atribui pra alunos. Cria contas de aluno. No futuro, paga pra ter alunos vinculados (freemium — grátis no início).
- **Aluno**: só altera peso/reps dos treinos que o coach montou pra ele. Não cria, não edita estrutura, não exclui treino.

Isso muda regra de autorização (quem pode fazer o quê com qual treino) de "é meu, ponto" pra "depende do papel e da relação coach↔aluno" — e provavelmente muda o schema (`usuarios` ganha um papel/relação com outro usuário; `treinos` passa a ter "quem criou" separado de "de quem é"). **Não vamos mexer nisso agora.** Mas é o motivo principal de por que vale organizar em camadas *agora*: se a regra de "posso mexer nisso?" estiver espalhada em `WHERE id = ? AND user_id = ?` direto no SQL (como está hoje), toda vez que o modelo de permissão mudar é preciso caçar e reescrever cada query. Se essa regra virar uma função de service (`treinoService.podeEditar(usuario, treino)`), o dia que o modelo mudar, muda a função, não o app inteiro.

### Estrutura alvo

```
backend/
  controllers/     # HTTP: le req, chama service, formata res. Zero SQL, zero regra de negocio.
  services/        # regra de negocio, validacao, autorizacao, orquestracao. Chama repositories.
  repositories/     # SO acesso a dado. Um arquivo por entidade. Espelha o SQL de hoje, so nomeado/centralizado.
  routes/           # so liga verbo+caminho HTTP ao controller (mesmo padrao que authRoutes ja usa)
  errors/           # classes de erro (NotFoundError, ValidationError, ForbiddenError, ConflictError)
  middleware/        # auth.js continua aqui
  logic/             # ProgressiveLogic.js continua aqui do jeito que esta - ja e funcao pura, nao mexe
  utils/
  server.js          # so cria o app, registra middlewares globais e monta os routers. Deve encolher bastante.
```

### Passos

**Fase 1 — Base (uma vez só, usada por tudo depois)** ✅ concluída
- [x] **TypeScript gradual só no backend**, via JSDoc + `checkJs` — `tsconfig.json` na raiz (`allowJs`, `checkJs`, `noEmit`, `types: ["node"]`), `typescript` + `@types/node` como devDependencies, script `npm run typecheck`. Escopo só em `backend/` e `DB/` — frontend fica de fora por agora
- [x] `DB/db.js` anotado com JSDoc (`Record<string, any>` nos retornos) — era pré-requisito, sem isso todo repository futuro herdaria tipos incorretos
- [x] `backend/errors/AppError.js` com `NotFoundError`, `ValidationError`, `ForbiddenError`, `ConflictError` (cada uma carrega o status HTTP correspondente)
- [x] Middleware de erro centralizado em `server.js` — mapeia `AppError` pro status certo, qualquer outro erro cai num 500 genérico **sem vazar `err.message` cru**
- [x] ~~Criar `asyncHandler`~~ — **desnecessário**: confirmei com teste real que o Express 5 (`^5.2.1`, já é o que o projeto usa) encaminha automaticamente `throw`/promise rejeitada de handler `async` pro middleware de erro, sem wrapper nenhum. Isso era coisa de Express 4, não se aplica aqui.

**Fase 2 — Domínio de treinos (primeiro, é o mais simples)**
- [x] `repositories/treinoRepository.js` e `repositories/exercicioRepository.js` — extrai as queries de hoje, só isso, sem mudar comportamento
- [x] `services/treinoService.js` — validação + a checagem de "esse treino é desse usuário?" vira código explícito aqui (hoje é implícito no `WHERE ... AND user_id = ?`)
- [x] `controllers/treinoController.js` + `routes/treinoRoutes.js`
- [x] Remove o código equivalente de `server.js`
- [x] Testa manualmente (listar/criar/editar/ativar/excluir treino) — testado via curl em 2026-08-13 contra o banco de produção (Turso), usando conta de teste dedicada (`contateste`) pra não misturar com dados reais. Todos os 7 endpoints (`POST/GET/PATCH/DELETE /api/treinos`, `PATCH .../ativo`, `POST .../exercicios`) responderam como esperado

**Fase 2 concluída.** ✅

**Fase 3 — Domínio de execuções (mais complexo, usa `ProgressiveLogic.js`)**
- [x] `repositories/execucaoRepository.js` + `repositories/serieRepository.js`
- [x] `services/execucaoService.js` — chama `ProgressiveLogic.js` pros cálculos, não duplica a lógica matemática
- [x] `controllers/execucaoController.js` + `routes/execucaoRoutes.js`
- [x] Remove o código equivalente de `server.js` — bloco `/* EXECUÇÕES DE TREINO */` removido, `execucaoRoutes` montado via `app.use('/api', execucaoRoutes)`
- [x] Testa manualmente — testado via curl em 2026-08-19 **local** (não contra Render, que ainda deploya a versão antiga) contra o banco de produção (Turso), usando conta de teste nova (`teste`, já que a `contateste` da Fase 2 não existe mais no banco). Os 6 endpoints (`executar`, `ultimo`, `progressao`, `series`, `finalizar`, obter execução) responderam certo, incluindo os cálculos de `delta_volume`/`progresso_percentual`/`delta_reps_por_exercicio` conferidos com uma segunda execução

**Fase 3 concluída.** ✅

**Fase 4 — Domínio de evolução/dashboard** (adiada de propósito — decisão de 2026, ver abaixo; design já fechado, falta só implementar)

**Decidido: dashboard novo fica enxuto** — substitui o de hoje (3 stat cards + calendário + gráfico de volume) por só isto:
- Um bloco **"treinos feitos"**: contagem total de execuções finalizadas, somando todos os treinos cadastrados
- Um gráfico de linha: **"progressão total"** ao longo do tempo

Sai de cena: dias seguidos (streak), calendário mensal, progressão média antiga (não ponderada) e o gráfico de volume por dia.

**A fórmula da progressão total** (discutida e fechada com exemplos — não é média simples nem soma de percentuais):

Motivo de não ser por volume: volume em kg não é comparável entre exercícios diferentes (ex: polia vs halter pro mesmo esforço) — descartado depois de discussão.
Motivo de não ser soma direta de percentuais: soma cresce sozinha conforme mais treinos são cadastrados, sem significar mais progresso de verdade.

Pra cada dia `d` que teve pelo menos 1 execução finalizada (de qualquer treino):

```
treinos_ativos_ate_d = todo treino que já teve ≥1 execução finalizada com data ≤ d

peso_i = número de execuções do treino i até o dia d
percentual_i = (volume_ultima_execucao_ate_d − volume_primeira_execucao_historico) / volume_primeira_execucao_historico × 100

progressão_total(d) = Σ(peso_i × percentual_i) / Σ(peso_i)
```

Casos-limite resolvidos pela própria matemática, sem `if` especial:
- Treino com só 1 execução até `d`: primeira = última execução, `percentual_i = 0`, mas entra com peso 1 (não distorce, não precisa excluir)
- Treino que ainda não existia em `d`: simplesmente não entra na soma daquele dia

**Decidido depois, corrigindo o design original:** sem janela de dias nenhuma — o gráfico mostra o **espaço de tempo total, fixo**, desde o primeiro treino já registrado até hoje. Não é uma janela deslizante (tipo "últimos 90 dias") que soma/esquece pontos com o tempo — cresce conforme o histórico cresce, e nunca corta dado antigo.

### Passos
- [x] `repositories/evolucaoRepository.js` — uma query só (`listarExecucoesFinalizadas`), traz todas as execuções finalizadas do usuário, ordenadas por treino e data
- [x] `services/evolucaoService.js` — implementa a fórmula acima, dia a dia, sobre o histórico completo (sem `JANELA_DIAS`, removida depois de feedback)
- [x] `controllers/evolucaoController.js` + `routes/evolucaoRoutes.js`
- [x] Remove o bloco antigo `/api/evolucao/dashboard` de `server.js` (e o import morto `db` que sobrou, trocado por só `{ initDB }`)
- [x] `EvolucaoView.vue` (frontend) — removido calendário, streak e progressão média antiga; gráfico refeito com a série de `progressão_total(d)` (eixo Y agora aceita negativo, com linha tracejada de referência no 0%); mantém só o stat "treinos feitos"
- [x] Testado manualmente com conta descartável (`teste_fase4_temp`, criada e apagada depois): 1ª execução → 0% (correto, sem base pra comparar ainda); 2ª execução com o dobro do peso → 100% (matematicamente exato)

**Fase 4 concluída.** ✅

**Bug encontrado durante o teste manual do frontend (não é da Fase 4, mas foi achado testando ela):** `src/services/api.js` tinha `API_URL` apontando pra `https://hackeando-seu-treino.onrender.com` como fallback de produção — sobra da arquitetura antiga (frontend no GitHub Pages, backend no Render, origens diferentes). Isso quebrava totalmente o teste local (`npm start` + `localhost:3000`): o app buildado tentava falar com o Render de verdade em vez do servidor local ao lado, e como o CORS do backend só libera `tiagogdella.github.io`, toda chamada falhava e ficava tentando de novo por ~50s (nosso próprio retry de hibernação do Render) antes de desistir — parecia "carregando pra sempre". Corrigido pra `API_URL = ''` (sempre caminho relativo) — funciona igual em dev (proxy do Vite), build local e produção real, já que agora front e back sempre rodam na mesma origem.

**Fase 5 — Alinhar auth ao mesmo padrão** (hoje só tem rota, sem service/repository explícitos)
- [x] `repositories/usuarioRepository.js`
- [x] `services/authService.js` — a lógica que hoje mora direto em `routes/auth.js` (login, register, hash de senha, emissão de token)
- [x] `controllers/authController.js` fino + `routes/auth.js` fino, só liga verbo+path no controller (mesmo padrão dos outros domínios)
- [x] Testado manualmente via curl em 2026-08-19 local: register (cria conta nova + auto-login), status, logout, login com conta existente, senha errada (401, confirma fix do bug do `bcrypt.compare` invertido) e username duplicado no register (409) — todos bateram como esperado

**Fase 5 concluída.** ✅

**Fase 6 — Fechar a base pra testes**
- [x] Testes unitários pro `ProgressiveLogic.js` — 13 testes em `backend/logic/ProgressiveLogic.test.js`, usando `node:test` (runner nativo do Node, zero dependência nova). Cobre a fórmula de Epley, o fator de fadiga em cada faixa de série (inclusive o piso mínimo a partir da 16ª), reordenação por `ordem`, progressão percentual (incluindo guarda contra divisão por zero) e delta de reps
- [x] CI no GitHub Actions (`.github/workflows/ci.yml`) — roda `npm ci` + `npm run typecheck` + `npm test` a cada push/PR, com credenciais placeholder do Turso (só pra `DB/db.js` não recusar subir; nenhum teste hoje toca o banco de verdade)
- [x] **Bug encontrado e corrigido**: `npm test` estava quebrado (`node --test backend/` não funciona passando uma pasta nessa versão do Node — tenta rodar a pasta como script principal em vez de procurar testes dentro dela). Corrigido pra glob explícito: `node --test 'backend/**/*.test.js'`. Confirmado rodando de verdade: 13 testes, 13 passando, `typecheck` limpo
- [ ] Testes pros services usando repository fake/mockado (sem precisar do Turso real — isso também ataca o risco do relatório sobre não ter separação dev/prod: testes automatizados simplesmente não tocam o banco de verdade)
- [ ] Decidir à parte (fica pendente, não é escopo desta seção) uma solução pra separação dev/prod do banco pra quando o teste for manual/exploratório, tipo o que aconteceu com o "ramon" de teste

**Fora de escopo aqui, de propósito:** nenhuma mudança de schema, papel de usuário, ou tela nova pro modelo coach/aluno. Essa seção é só a reorganização das camadas do código que já existe hoje — o pivot vira uma seção própria no TODO quando (e se) for decidido seguir com ele.

---

## 4. (placeholder pra próximas frentes)

Vamos adicionando aqui conforme surgirem — próximas ideias, bugs conhecidos, features.
