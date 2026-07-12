# Arquitetura Modular do Projeto

Este projeto foi reorganizado para separar responsabilidades e facilitar manutencao, testes e evolucao.

## Estrutura principal

```text
src/
  config/          Configuracoes da aplicacao
  controllers/     Entrada HTTP e respostas da API
  database/        Conexao SQLite e schema/migracao
  dtos/            Conversao entre banco de dados e resposta da API
  nosql/           Armazenamento documental JSONL para snapshots analiticos
  repositories/    Consultas e comandos SQL
  routes/          Roteamento de API e arquivos estaticos
  services/        Regras de negocio
  utils/           Funcoes compartilhadas
  validators/      Validacoes de entrada
```

## Fluxo de uma requisicao

```text
HTTP request
  -> routes
  -> controller
  -> service
  -> repository
  -> database
  -> DTO
  -> JSON response
```

## Camadas

### Routes

Identificam o caminho da URL e direcionam para o controller correto.

Exemplos:

- `src/routes/api.routes.js`
- `src/routes/app.routes.js`

### Controllers

Tratam detalhes HTTP: ler corpo da requisicao, chamar servico e devolver status/resposta.

Exemplos:

- `src/controllers/auth.controller.js`
- `src/controllers/estoque.controller.js`

### Services

Concentram regras de negocio, como:

- autenticacao;
- criacao de sessao;
- validacao de duplicidade;
- cadastro e atualizacao de produtos;
- associacao produto/fornecedor;
- importacao de NF-e;
- carga de mockups;
- relatorios e indicadores de BI.

Exemplos:

- `src/services/auth.service.js`
- `src/services/estoque.service.js`
- `src/services/relatorios.service.js`

### Repositories

Centralizam acesso ao banco SQLite e evitam SQL espalhado pelos controllers.

Exemplos:

- `src/repositories/usuario.repository.js`
- `src/repositories/estoque.repository.js`

### DTOs

Padronizam a saida da API e protegem o frontend dos nomes internos do banco.

Exemplo: o banco usa `codigo_barras`, mas a API responde `codigoBarras`.

Arquivos:

- `src/dtos/produto.dto.js`
- `src/dtos/fornecedor.dto.js`
- `src/dtos/usuario.dto.js`
- `src/dtos/atividade.dto.js`
- `src/dtos/associacao.dto.js`

### NoSQL documental

Foi adicionada uma camada simples de documentos em JSONL:

- `src/nosql/document-store.js`
- pasta gerada em runtime: `data/nosql/`

Uso atual:

- snapshots de relatorios de estoque;
- documentos flexiveis para indicadores de BI;
- historico analitico sem alterar o schema relacional principal.

Essa camada representa o conceito de banco orientado a documentos usando JSON local. Para producao, ela pode ser trocada por MongoDB mantendo a camada de service.

## Endpoints relevantes

### Autenticacao

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/google-demo`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Estoque

- `GET /api/produtos`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`
- `GET /api/fornecedores`
- `POST /api/fornecedores`
- `PUT /api/fornecedores/:id`
- `DELETE /api/fornecedores/:id`

### Associacoes

- `GET /api/associacoes`
- `POST /api/produtos/:produtoId/fornecedores/:fornecedorId`
- `DELETE /api/produtos/:produtoId/fornecedores/:fornecedorId`

### BI e NoSQL

- `GET /api/relatorios`
- `GET /api/relatorios/snapshots`

## Beneficios da modularizacao

- Menos codigo concentrado em um arquivo unico.
- Regras de negocio reutilizaveis por API, testes e scripts.
- DTOs documentam o contrato da API.
- Repositories isolam SQL.
- Services facilitam evolucao para MongoDB, autenticacao real ou outro frontend.
- Testes continuam passando sem alterar o fluxo do usuario.
