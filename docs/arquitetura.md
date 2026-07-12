# Arquitetura do Sistema

## Visao geral

```mermaid
flowchart TB
  User["Usuario"] --> Browser["Interface Web"]
  Browser --> Static["Arquivos publicos"]
  Browser --> API["API REST Node.js"]
  API --> Auth["Auth Service"]
  API --> Estoque["Estoque Service"]
  API --> Relatorios["Relatorios Service"]
  Auth --> UsuariosRepo["Usuario Repository"]
  Estoque --> EstoqueRepo["Estoque Repository"]
  Relatorios --> EstoqueRepo
  UsuariosRepo --> SQLite["SQLite"]
  EstoqueRepo --> SQLite
  Relatorios --> NoSQL["Document Store JSONL"]
```

## Banco transacional

O SQLite guarda os dados operacionais:

- usuarios;
- sessoes;
- fornecedores;
- produtos;
- associacoes produto/fornecedor;
- atividades.

## Camada documental NoSQL

A camada JSONL guarda snapshots analiticos dos relatorios:

- indicadores;
- dimensoes;
- alertas de baixo estoque;
- historico de visoes gerenciais.

Essa separacao demonstra o uso combinado de dados transacionais e documentos analiticos.

## Fluxo principal

```mermaid
sequenceDiagram
  participant U as Usuario
  participant F as Frontend
  participant A as API
  participant S as Service
  participant R as Repository
  participant DB as SQLite

  U->>F: Preenche formulario
  F->>A: Envia requisicao JSON
  A->>S: Chama regra de negocio
  S->>R: Solicita persistencia
  R->>DB: Executa SQL
  DB-->>R: Retorna dados
  R-->>S: Entidade
  S-->>A: DTO e mensagem
  A-->>F: Resposta JSON
  F-->>U: Atualiza tela/modal
```

## Decisoes arquiteturais

- API REST simples para facilitar demonstracao.
- SQLite por ser leve e sem instalacao externa.
- JSONL como NoSQL local para documentos analiticos.
- DTOs para separar modelo interno do contrato da API.
- Services para manter regras de negocio testaveis.
- Modais no frontend para reduzir poluicao visual.
