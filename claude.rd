# OldBook — Claude Code Project Context

Este arquivo define **o contexto completo do projeto OldBook** para uso com o Claude Code. O objetivo é garantir continuidade, decisões técnicas consistentes e alinhamento com a lógica do app conforme já discutido.

---

## 📌 Visão Geral do Projeto

**OldBook** é um aplicativo de acompanhamento de treinos de força (musculação e calistenia), inspirado em um *caderno de treinos*. O foco é **simplicidade**, **progressão clara** e **controle histórico**, evitando complexidade prematura.

O usuário registra:

* Nome do treino
* Data
* Exercícios
* Séries (peso + repetições)

O app calcula automaticamente métricas de progresso, com destaque para **sobrecarga progressiva**.

---

## 🧠 Filosofia do Projeto

* ❌ Não é um app fitness genérico
* ❌ Não foca em cardio ou calorias
* ✅ Foco em **força**
* ✅ Interface simples
* ✅ Lógica transparente
* ✅ Código didático (projeto de aprendizado)

O projeto prioriza **clareza > abstração excessiva**.

---

## 🏋️‍♂️ Lógica de Progressão (REGRA CENTRAL)

A progressão é baseada em **Volume Total estimado**, calculado a partir de **1RM estimado por série**, usando a **Fórmula de Epley**.

### Fórmula

```
1RM = peso × (1 + reps / 30)
```

### Volume do Exercício

* Para cada série, calcula-se um 1RM estimado
* O **volume do exercício** é a **soma dos 1RM estimados de todas as séries**

### Progressão

* Cada exercício é comparado **somente com o último treino do mesmo exercício**
* Não há comparação entre treinos diferentes
* A progressão considera automaticamente:

  * Aumento de carga
  * Aumento de repetições
  * Aumento ou redução de séries

Resultado:

```
Δ Volume = Volume atual − Volume do último treino
```

Essa métrica define se houve progresso, estagnação ou regressão.

---

## 🧱 Estrutura de Dados (Conceitual)

### Treino

* id
* nome
* data

### Exercício

* id
* nome
* treino_id

### Série

* id
* exercicio_id
* peso
* repeticoes

> ⚠️ Importante: o banco salva **dados crus** (peso e reps). Cálculos são feitos **em tempo de execução**.

---

## 👤 Experiência do Usuário (UX)

### Filosofia de Uso

O app deve funcionar como um **caderno de treinos digital**:

* Todos os dias o usuário anota: volume, peso e séries
* Interface simples e direta
* Foco no registro rápido durante o treino

### Comparação e Progressão

* **Cada treino compara APENAS com ele mesmo**
* Progressão mostrada **somente em percentual**
* Isso dificulta (propositalmente) comparação entre treinos diferentes
* Objetivo: focar na evolução individual de cada treino

### Sistema de 3 Pontos de Comparação

O app salva **3 versões de cada treino**:

1. **Base** → primeiro treino registrado (referência inicial)
2. **Último** → treino anterior mais recente
3. **Atual** → treino sendo executado agora

**O que mostrar ao usuário:**

* **Δ Reps desde o último treino** → "Você fez +2 reps no Supino"
* **Δ Volume percentual desde a base** → "Progresso total: +15%"

### Direcionamento de Progressão

O app deve guiar o usuário a:

1. **Manter o peso fixo**
2. **Aumentar as repetições** gradualmente
3. Quando as reps ultrapassarem o "objetivo mental" do usuário → aumentar o peso

### Regra de Ouro

**NUNCA abaixar o volume**, exceto quando absolutamente necessário (lesão, fadiga extrema, etc.).

O app deve sutilmente desincentivar regressões.

---

## 🗄️ Banco de Dados

* Banco: **SQLite**
* Objetivo inicial: testes locais e validação da lógica
* Sem otimizações prematuras
* Deve armazenar: Base, Último e Atual para cada treino

---

## 🛠️ Stack Técnica (Atual)

* HTML
* CSS
* JavaScript (vanilla)
* SQLite

### Aprendizado em andamento

* Java (POO, classes, static, abstract)
* React (planejado)
* Backend futuro (não definido ainda)

---

## 🧩 Orientações de Código

Claude deve:

* Evitar abstrações desnecessárias
* Evitar frameworks sem justificativa
* Preferir código explícito e legível
* Priorizar funções puras quando possível
* Comentar código **quando didático**, não óbvio

### POO

* POO só deve ser usada quando **realmente fizer sentido**
* Estruturas simples são preferidas neste estágio

---

## 🚧 O que NÃO fazer

* Não salvar métricas calculadas (1RM, volume)
* Não comparar exercícios diferentes
* Não comparar treinos diferentes
* Não criar sistemas de ranking, badges ou gamificação

---

## 🎯 Objetivo Final do Projeto

* Criar um app funcional de treinos
* Servir como projeto de aprendizado real
* Evoluir gradualmente para algo mais robusto
* Possível reescrita futura em React + backend

---

## 🧠 Contexto do Desenvolvedor

* Treina há mais de 10 anos focado em força
* Prefere treinos curtos
* Não pratica cardio
* Valoriza progressão clara e objetiva
* Está migrando para conceitos mais sólidos de programação

---

## 📝 Observação Final

Sempre que houver dúvida entre **simplicidade** e **arquitetura avançada**, escolha **simplicidade**.

Este arquivo deve ser tratado como **fonte de verdade do projeto**.
