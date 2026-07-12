# FACULDADE GRAN

Projeto Disciplina Projeto Integrador

## Sistema de Controle de Estoque

Aplicacao full stack desenvolvida em Node.js, SQLite e frontend web para atender ao Projeto Integrador Full Stack.

## Funcionalidades

- Login com usuario local e sessao por token.
- Botao de login Google em modo demonstrativo local.
- Cadastro, listagem, edicao e exclusao de fornecedores.
- Validacao de CNPJ unico para fornecedores.
- Cadastro, listagem, edicao e exclusao de produtos.
- Validacao de codigo de barras unico para produtos.
- Busca de produtos e painel lateral de visualizacao/cadastro.
- Leitura de codigo de barras pela camera quando o navegador suporta `BarcodeDetector`.
- Importacao de XML de NF-e para cadastrar produtos em lote.
- Historico dos ultimos cadastros, importacoes e associacoes.
- Navegacao lateral com usuario logado e logout.
- Barra superior com breadcrumb, notificacoes e historico de navegacao.
- Rotas no navegador por hash, como `#/produtos`, `#/fornecedores` e `#/associacoes`.
- Sidebar recolhivel com icones para cada modulo.
- Cards flutuantes animados para erros e avisos.
- Modal de confirmacao para cadastros, importacoes e associacoes.
- Aba de relatorios com filtros, totais, valor estimado, categorias e baixo estoque.
- Botao para carregar mockups diretamente pela interface.
- Associacao e desassociacao entre produtos e fornecedores.
- Consulta visual das associacoes produto/fornecedor.
- Persistencia dos dados em SQLite.

## Tecnologias

- Node.js
- SQLite via `node:sqlite`
- Camada documental NoSQL local em JSONL para snapshots de relatorios
- HTML, CSS e JavaScript

Requisito recomendado: Node.js 22 ou superior, pois o projeto usa o SQLite nativo do Node.

## Como Rodar

1. Abra a pasta do projeto no Visual Studio Code.
2. No terminal, execute:

```bash
npm start
```

3. Acesse no navegador:

```text
http://localhost:3000
```

O banco SQLite sera criado automaticamente na pasta `data/`.

Usuario inicial:

```text
E-mail: admin@estoque.local
Senha: 123456
```

O login com Google esta representado como fluxo demonstrativo local. Para usar OAuth real do Google em producao, seria necessario criar credenciais no Google Cloud e configurar callback/Client ID.

## Dados Simulatorios

Para carregar uma massa de demonstracao:

```bash
npm run seed
```

Arquivos de apoio:

- `docs/dados-simulatorios.md`
- `docs/roteiro-de-testes.md`
- `sample-data/dados-simulatorios.json`
- `sample-data/nfe-exemplo.xml`

Depois de carregar os dados, acesse:

```text
http://127.0.0.1:3000/#/relatorios
```

## Como Testar o Backend

Execute:

```bash
npm test
```

O teste cria um banco temporario, sobe o servidor, cadastra fornecedor, cadastra produto, cria associacao e valida as respostas principais.

## Rotas Principais da API

### Fornecedores

- `GET /api/fornecedores`
- `POST /api/fornecedores`
- `GET /api/fornecedores/:id`
- `PUT /api/fornecedores/:id`
- `DELETE /api/fornecedores/:id`

### Produtos

- `GET /api/produtos`
- `POST /api/produtos`
- `GET /api/produtos/:id`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`

### Associacoes

- `GET /api/associacoes`
- `POST /api/produtos/:produtoId/fornecedores/:fornecedorId`
- `DELETE /api/produtos/:produtoId/fornecedores/:fornecedorId`
- `GET /api/produtos/:id/fornecedores`
- `GET /api/fornecedores/:id/produtos`

### Importacao e historico

- `POST /api/importacoes/nota`
- `GET /api/atividades`
- `GET /api/relatorios`
- `GET /api/relatorios/snapshots`

O importador da tela de produtos aceita XML de NF-e. Ele le o emitente como fornecedor, extrai os itens da nota e cadastra/atualiza produtos automaticamente em lote.

## Arquitetura

O backend foi modularizado em camadas:

- `routes`: roteamento da API e dos arquivos estaticos.
- `controllers`: entrada HTTP e respostas.
- `services`: regras de negocio.
- `repositories`: consultas SQL.
- `dtos`: formato de saida da API.
- `validators`: validacao dos dados recebidos.
- `nosql`: armazenamento documental JSONL para indicadores de BI.

Documentos de apoio:

- `docs/arquitetura-modular.md`
- `docs/revisao-5-periodo.md`

## Exemplos Para Insomnia ou Postman

### Cadastrar fornecedor

```http
POST http://localhost:3000/api/fornecedores
Content-Type: application/json
```

```json
{
  "nomeEmpresa": "Distribuidora Alfa",
  "cnpj": "12.345.678/0001-90",
  "endereco": "Rua Central, 100",
  "telefone": "(61) 3333-4444",
  "email": "contato@alfa.com",
  "contatoPrincipal": "Ana Souza"
}
```

### Cadastrar produto

```http
POST http://localhost:3000/api/produtos
Content-Type: application/json
```

```json
{
  "nome": "Teclado USB",
  "codigoBarras": "7891234567890",
  "descricao": "Teclado com conexao USB",
  "preco": 89.9,
  "quantidade": 25,
  "categoria": "Eletronicos",
  "dataValidade": "",
  "imagem": ""
}
```

### Associar fornecedor a produto

```http
POST http://localhost:3000/api/produtos/1/fornecedores/1
```
