# Roteiro de Testes Manuais

## Login

1. Acesse `http://127.0.0.1:3000`.
2. Tente entrar com senha errada.
3. Verifique se aparece um card flutuante de erro.
4. Entre com `admin@estoque.local` e senha `123456`.

## Cadastro individual

1. Acesse `#/produtos`.
2. Cadastre um produto.
3. Verifique se aparece o modal de confirmacao.
4. Confira o produto na tabela e no painel lateral.

## Importacao de NF-e

1. Acesse `#/produtos`.
2. Selecione `sample-data/nfe-exemplo.xml`.
3. Clique em "Importar produtos".
4. Verifique o modal de confirmacao e os ultimos adicionamentos.

## Associacao

1. Acesse `#/associacoes`.
2. Selecione um produto e um fornecedor.
3. Clique em "Associar".
4. Verifique o modal de confirmacao e a tabela.

## Relatorios

1. Acesse `#/relatorios`.
2. Clique em "Carregar dados falsos" se quiser popular a base com mockups.
3. Confira totais de produtos, fornecedores, associacoes, estoque e baixo estoque.
4. Use os filtros de categoria, estoque e faixa de preco.
5. Verifique as tabelas de categoria e produtos com baixo estoque.

## Navegacao

1. Clique no botao da sidebar para recolher o menu.
2. Confira se os icones continuam visiveis.
3. Abra novamente a sidebar e navegue entre as abas.
