# Validação do Fresta

Executada em 03/11/2026, Node 24, Windows e navegador integrado Chromium.

## Modelo e build

- Onze testes Node aprovados: primeira casa e todas suas vizinhas seguras em cada uma das 184 posições iniciais dos três formatos; quantidade de fendas e determinismo; contagens verificadas por cálculo independente; três vitórias completas; flags pré-início, limite e bloqueio de flood; entradas inválidas; acorde correto e errado; derrota direta; seed nova/repetida; saves inválidos e registros imutáveis.
- Build Vite concluído com paths relativos e hashes no jogo/CSS. npm audit sem vulnerabilidades reportadas na árvore instalada.
- Modelo sem timers/loop contínuo, UI por estado. Limite de quatro vozes de áudio, inicialmente desligado.

## Interface e export

- Três formatos concluídos pela UI: Baía 34 casas/7 ações, Travessia 50/17, Platô 68/40. Rotas automatizadas usam mapas conhecidos gerados externamente pelo modelo, sem injetar estado no app; não comprovam dedução humana ou ausência de risco.
- Acorde correto após bandeira por botão direito: progresso 4/34 → 5/34. Acorde com bandeira errada: derrota em três ações. Seleção de número aberto e atalho C conferidos.
- Setas, F para marcar/desmarcar, Enter para explorar e Escape para pausa testados. Seta/F no modal não mudou as três ações; retomada devolveu foco ao tabuleiro.
- Novo mapa alterou seed para 672103, e Repetir a preservou com zero ações. Abandono não registrou resultado.
- Platô concluído em viewport 390 × 844 usando somente setas de seleção e botão Explorar, em trajeto serpenteado: 68 casas/39 ações. Sem overflow horizontal. Células do maior mapa: 24,5 px; controles alternativos de seleção/ação: 44 px. Isso não é teste em telefone físico.
- Preview do build: Baía concluída, alternância de som/movimento, manual e reload preservaram exatamente uma expedição/uma vitória/best7; partida em andamento voltou a zero.

## Segurança e publicação

GitHub Pages em repositório público disponível no GitHub Free: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages . Sem cartão, trial, backend ou consumo de serviço faturável. Sem credenciais ou dados pessoais na aplicação.

Verificação de histórico, clone remoto, autoria, CI, artefato e partidas públicas será registrada após o deploy.

## Limites

Sem telefone físico, Safari, gamepad, avaliação auditiva humana ou leitor de tela integral. Blur/visibility/BFCache tratados sem prova física em todos os navegadores. Casas pequenas em formatos densos têm alternativa de seleção por botões grandes; não se promete precisão universal de toque. Primeiro passo seguro não é prova de solução exclusivamente lógica. Recordes de ações agregam seeds diferentes e não medem habilidade comparável. Sem save de rodada, sincronização ou garantia offline/invulnerabilidade/gratuidade permanente.
