# Plano de Testes

## Objetivo

Validar os principais fluxos do sistema de controle de estoque antes da entrega academica.

## Comandos

```powershell
npm.cmd test
npm.cmd run review:code
npm.cmd run review:data
npm.cmd run quality
```

## Testes automatizados atuais

O arquivo `scripts/smoke-test.js` valida:

| Fluxo | Cobertura |
| --- | --- |
| Acesso protegido | Garante que rotas privadas retornam 401 sem login |
| Login invalido | Garante que senha incorreta retorna 401 |
| Login valido | Garante token de sessao |
| Cadastro de usuario | Garante criacao e bloqueio de e-mail duplicado |
| Fornecedor | Cria, valida duplicidade, atualiza e exclui fornecedor temporario |
| Produto | Cria, atualiza e exclui produto temporario |
| Associacao | Associa produto e fornecedor |
| NF-e | Importa produtos e fornecedor por nota fiscal |
| Atividades | Verifica historico de importacao |
| Mockups | Carrega dados falsos pela API |
| Relatorios | Gera indicadores e snapshots documentais |

## Testes manuais recomendados

1. Acessar `http://127.0.0.1:3000`.
2. Fazer login com `admin@estoque.local` e senha `123456`.
3. Criar produto pelo modal.
4. Editar produto pelo modal.
5. Excluir produto criado para teste.
6. Criar fornecedor pelo modal.
7. Editar fornecedor pelo modal.
8. Criar associacao pelo modal.
9. Importar `sample-data/nfe-exemplo.xml`.
10. Acessar a aba `Relatorios` e conferir filtros, cards e graficos.

## Criterio de aceite

O projeto esta aprovado para entrega quando:

- `npm.cmd run quality` termina sem erro;
- a tela de login abre corretamente;
- modais de produto, fornecedor e associacao funcionam;
- relatorios exibem indicadores e graficos;
- o Git esta sem alteracoes pendentes apos commit.
