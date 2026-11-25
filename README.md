# Pulso, plataforma de online coaching

Frontend completo de uma plataforma para treinadores e nutricionistas acompanharem alunos online. React 18, TypeScript e Vite. Todos os nomes e dados de exemplo são fictícios.

## Experimentar já

Abre `demo/pulso.html` no browser (duplo clique). É a app inteira num só ficheiro, com os dados guardados no próprio browser.

## Correr o projeto

```bash
npm install
npm run dev          # servidor de desenvolvimento em http://localhost:5173
npm run build        # verifica os tipos e gera a build em dist/
npm run build:single # gera um único index.html autónomo em dist-single/
```

Requer Node 18 ou mais recente.

## Funcionalidades

**Trabalho do dia**
- Hoje: resumo do dia (eventos, aniversários, subscrições a terminar, pagamentos em atraso), fila "Precisa de ti", avaliações por rever, mensagens recentes, agenda, tarefas, link público e novidades.
- Copilot: propostas com o motivo à vista (queixas, inatividade, peso estagnado, renovações, pagamentos, progressões, conquistas). Ação com um clique, dispensar e repor, ligar e desligar.
- Alunos: lista com filtros, ordenação e exportação CSV; modo retenção com pontuação de risco; transformações ordenadas por qualquer medida (peso, IMC, massa gorda, massa magra, visceral, perímetros), por % ou valor absoluto, filtros por período, sexo, idade, etiqueta, treinador e "apenas publicáveis", comparativo antes e depois e descarga.
- Ficha do aluno: resumo, registos diários, gráficos de medições, planos, suplementação, cursos, subscrição, avaliações, notas, pacote de boas-vindas.
- Mensagens: conversas, marcar como não lida com 8 cores, filtros e contadores por cor, mensagem para vários alunos.
- Avaliações: lista completa por aluno (quem tem mais pendentes primeiro), filtros por tipo com contadores, revisão com feedback enviado por mensagem, exportação em PDF de uma ou várias.
- Streak: dias seguidos em que cada aluno marcou na app que foi ao ginásio (várias idas no mesmo dia contam como um dia), melhor sequência, dias nos últimos 30, filtros "foram hoje", "ainda não foram" e "sem streak", e lembrete por mensagem a quem pode perder o streak.
- Calendário: mês e agenda, eventos recorrentes, limite de inscrições (mantém-se ao mudar a recorrência), eventos pessoais registados pelos alunos.

**Biblioteca**
- Treinos: modelos, planos por aluno, biblioteca de exercícios, editor com supersets e circuitos, alternativas, tempo estimado (descanso por preencher conta 0 s).
- Nutrição: modelos e planos por aluno com alternativas por refeição e macros; refeições públicas ou privadas (ícone do olho) com foto; alimentos com imagem; pedidos de receita dos alunos, inseridos como refeição nova ou alternativa, com destaque no editor e conclusão automática ao guardar.
- Ginásios: catálogo próprio de ginásios e do equipamento de cada um (não há base de dados pública com isto), catálogo de equipamentos, equipamento necessário por exercício, aviso no editor de treino quando um exercício não dá para fazer no ginásio do aluno, filtro "só o que dá para fazer" ao escolher exercícios. Na app, o aluno escolhe onde treina ou pede para acrescentar um ginásio que falta.
- Histórico de alterações dos planos: cada gravação cria uma versão, comparação campo a campo, plano completo de cada versão e restauro.
- Suplementação (suplementos e protocolos), questionários (6 tipos de pergunta, pré-visualização), cursos (módulos e aulas, inscrições), cofre de ficheiros (pastas, partilha, descarga).

**Automatizar, equipa e negócio**
- Pacotes de boas-vindas e automações (gatilho e ação, execução manual, contadores).
- Staff com funções, convites e pré-alocação de conversas e alunos; "Ver como" para ver a plataforma como cada membro.
- Comunidades com publicações, gostos, comentários e fixar.
- Os meus planos (pacotes à venda e receita mensal), A minha app (marca, cores e separadores com pré-visualização ao vivo), integrações, indicações, subscrição, definições (exportar, importar e repor dados) e suporte.

**App do aluno (simulador)**
Hoje, treino, nutrição, receitas com pedido e nota, check-in diário e periódico (fotos tiradas na hora ou da galeria, comprimidas antes de guardar, e respostas de texto ditadas por voz em português com o botão Ditar; o treinador vê as fotos na revisão, ampliadas e no PDF), agenda pessoal, chat e aviso com o que mudou no plano. Registo rápido no ecrã Hoje (foto, texto ditado e energia), lembrete diário a uma hora escolhida (aviso na app e notificação do browser, só com a app aberta), fotos antes e agora lado a lado com a diferença de peso, e treino guiado (marcar cada série, peso da última vez, cronómetro de descanso com som e vibração). Tudo o que o aluno faz chega à conta do treinador.

**Para o treinador**
- Ditado por voz no feedback das avaliações e nas mensagens.
- Respostas rápidas guardadas, inseridas com um clique e geridas no próprio sítio.
- Fila de revisão: "Revista, seguinte" com Ctrl+Enter, Alt+↑ e Alt+↓ para andar na fila, contador de quantas faltam.
- Modo escuro (botão da lua na barra de cima ou na app do aluno). Segue o sistema até escolheres; o PDF sai sempre claro.

## Estrutura

```
src/
  store/types.ts      modelo de dados
  store/seed.ts       dados de exemplo fictícios
  store/persist.ts    persistência (localStorage), ponto de ligação a uma API
  store/store.tsx     estado global
  lib/actions.ts      regras de negócio (mensagens, versões, pacotes, automações)
  lib/domain.ts       cálculos (risco, macros, tempos, eventos recorrentes)
  lib/copilot.ts      regras do Copilot
  lib/diff.ts         comparação de versões de planos
  components/         interface base, gráficos, navegação
  pages/              um ficheiro por área
  student/            app do aluno
```

## O que é simulado

Não há servidor: autenticação, pagamentos, notificações push, envio de emails, integrações e publicação nas lojas são simulados. Os dados ficam no `localStorage` do browser. Para passar a produção, substitui `store/persist.ts` por chamadas à tua API e move as funções de `lib/actions.ts` para o backend.
