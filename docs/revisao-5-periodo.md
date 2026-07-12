# Revisao Geral com Base no 5 Periodo

Esta revisao considera os materiais encontrados no caminho do 5 periodo, principalmente:

- Front-End: aplicacao modular, React, rotas, consumo de APIs e fullstack.
- Estrategia/decisoes: arquitetura, qualidade, manutencao e evolucao.
- Banco de Dados NoSQL: modelagem documental, JSON, MongoDB e tipos de NoSQL.
- Inteligencia de Negocios: arquitetura de BI, dashboards, indicadores e apresentacao de dados.
- Projeto Integrador Full Stack: sistema de controle de estoque com fornecedores, produtos e regras de negocio.

## Status por criterio

| Area | Status | Evidencias no projeto | Melhorias recomendadas |
| --- | --- | --- | --- |
| Projeto Integrador Full Stack | Atendido | Sistema de estoque com produtos, fornecedores, associacoes, login, NF-e, mockups e API | Criar apresentacao final com prints, arquitetura e roteiro de demonstracao |
| Front-End | Parcialmente atendido | Interface responsiva, rotas por hash, sidebar, modais, relatorios e consumo de API | Migrar o frontend para componentes ES modules ou React/Vite se o professor exigir React |
| Aplicacao modular | Atendido no backend, parcial no frontend | Backend separado em routes, controllers, services, repositories, DTOs e validators | Modularizar tambem `public/app.js` em componentes de tela |
| API e Full Stack | Atendido | API REST com autenticacao, CRUD, associacoes, importacao e relatorios | Adicionar documentacao OpenAPI/Swagger no futuro |
| Autenticacao e seguranca | Parcialmente atendido | Login local, token, hash de senha PBKDF2, sessao e logout | OAuth Google real ainda e demonstrativo local |
| Banco relacional | Atendido | SQLite com tabelas, chaves estrangeiras e constraints de unicidade | Opcional: diagrama ER no relatorio final |
| Banco NoSQL | Parcialmente atendido | Camada documental JSONL em `src/nosql` para snapshots de BI | Para ficar mais forte academicamente, trocar/adicionar MongoDB |
| Inteligencia de Negocios | Atendido inicialmente | Aba de relatorios, filtros, KPIs, baixo estoque e endpoint `/api/relatorios` | Adicionar graficos visuais e mais indicadores gerenciais |
| Dados de teste/mockups | Atendido | `sample-data`, `docs/dados-simulatorios.md`, seed por script e por interface | Ampliar massa com mais categorias e cenarios |
| Qualidade e testes | Atendido inicialmente | `npm test` com smoke test cobrindo login, CRUD, associacao, NF-e, mockups e relatorios | Criar testes unitarios por service |
| Git/GitHub | Atendido | Repositorio conectado e branch `main` publicada no GitHub | Usar commits pequenos por etapa e tags de versao |

## Analise tecnica

O projeto ja atende bem ao escopo funcional do controle de estoque. As historias principais de cadastro de fornecedores, cadastro de produtos, restricao de duplicidade e associacao entre produto e fornecedor foram implementadas.

Depois da modularizacao, o backend ficou mais proximo de uma arquitetura profissional:

```text
Route -> Controller -> Service -> Repository -> Database -> DTO -> Response
```

Essa separacao melhora a manutencao porque cada parte tem uma responsabilidade clara.

## Ponto de atencao: Front-End

Os materiais de front-end do periodo destacam React, componentes reutilizaveis, props, states, rotas e consumo de API. O projeto atual usa HTML, CSS e JavaScript puro. Ele cumpre a experiencia de usuario e consumo de API, mas nao demonstra React diretamente.

Se o professor exigir React, a recomendacao e criar uma proxima versao com Vite + React, reaproveitando a API atual.

## Ponto de atencao: NoSQL

O projeto principal usa SQLite, que e relacional. Para contemplar NoSQL, foi adicionada uma camada documental local em JSONL para snapshots de relatorios.

Essa solucao demonstra:

- documentos JSON;
- flexibilidade de schema;
- historico analitico;
- separacao entre dados transacionais e dados de BI.

Para uma entrega mais forte, o ideal seria adicionar MongoDB como opcional ou explicar no relatorio que o JSONL foi usado como simulacao local de banco orientado a documentos.

## Ponto de atencao: BI

A aba de relatorios ja possui:

- totais;
- filtros;
- categorias;
- baixo estoque;
- valor estimado;
- ultimas atividades.

O backend agora tambem possui:

- `GET /api/relatorios`;
- `GET /api/relatorios/snapshots`;
- snapshots NoSQL dos indicadores.

Isso fortalece a relacao com Inteligencia de Negocios.

## Proximos passos sugeridos

1. Modularizar o frontend em arquivos separados por tela e componentes.
2. Adicionar graficos nos relatorios.
3. Criar um diagrama da arquitetura no README ou em documento separado.
4. Adicionar MongoDB opcional ou documentar claramente a camada JSONL como NoSQL local.
5. Criar testes unitarios para services e validators.
6. Preparar um roteiro de apresentacao final com prints e criterios atendidos.
