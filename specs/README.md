# 📐 Encrypthor — Especificações Técnicas

Este diretório contém as especificações detalhadas para cada fase de desenvolvimento do **Encrypthor**, um jogo web multiplayer de adivinhação de palavras embaralhadas.

---

## 📋 Índice de Especificações

| # | Arquivo | Foco | Dependências |
|---|---------|------|-------------|
| 01 | `01-setup-projeto.md` | Scaffold do monorepo, Next.js, servidor Socket.IO, Prisma, Docker | Nenhuma |
| 02 | `02-tela-inicial.md` | Home page, nickname, criar/entrar em sala | #01 |
| 03 | `03-sala-espera.md` | Lobby, prontidão, expulsão, início do jogo | #02 |
| 04 | `04-game-loop-server.md` | Lógica do jogo no servidor (sorteio, timers, embaralhamento, pontuação) | #03 |
| 05 | `05-jogo-ativo-cliente.md` | UI do jogo no cliente (palpite, letras, timer, placar) | #04 |
| 06 | `06-polimento-final.md` | Animações, som, Docker otimizado, README, deploy | #05 |

---

## 🎯 Como Usar

Cada spec contém:

1. **Objetivo** — O que será implementado
2. **Arquivos Envolvidos** — Lista de arquivos a criar/modificar
3. **Fluxo de Dados** — Como os dados trafegam (Socket/HTTP)
4. **Tipos Compartilhados** — Interfaces TypeScript
5. **Tarefas Detalhadas** — Passo a passo implementável
6. **Critérios de Aceitação** — Como saber se a tarefa está completa
7. **Casos de Borda** — Edge cases a tratar

> **Ordem:** As fases devem ser seguidas em ordem, pois cada uma depende da anterior.

---

## 🐳 Stack

| Tecnologia | Versão | Função |
|-----------|--------|--------|
| Next.js | 14+ (App Router) | Frontend web |
| Tailwind CSS | 3.x | Estilização |
| Socket.IO | 4.x | Tempo real |
| Express | 4.x | Servidor HTTP + Socket |
| Prisma | 5.x | ORM PostgreSQL |
| PostgreSQL | 16 | Banco de dados |
| Docker Compose | 3.x | Orquestração |
