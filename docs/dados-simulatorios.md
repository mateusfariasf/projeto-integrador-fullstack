# Dados Simulatorios

Este arquivo documenta um conjunto pequeno de dados para demonstrar o sistema de controle de estoque.

## Usuarios

| Nome | E-mail | Senha | Perfil |
| --- | --- | --- | --- |
| Administrador | admin@estoque.local | 123456 | Usuario inicial |

## Fornecedores

| Empresa | CNPJ | Contato | Telefone | E-mail |
| --- | --- | --- | --- | --- |
| Distribuidora Central | 11.222.333/0001-44 | Ana Souza | (61) 3333-4444 | contato@central.local |
| Tech Suprimentos | 22.333.444/0001-55 | Bruno Lima | (61) 3555-1212 | vendas@tech.local |
| Alimentos Brasil | 33.444.555/0001-66 | Carla Mendes | (61) 3777-8888 | comercial@alimentos.local |

## Produtos

| Produto | Codigo de barras | Categoria | Preco | Quantidade |
| --- | --- | --- | --- | --- |
| Teclado USB | 7891000000001 | Eletronicos | 89.90 | 12 |
| Mouse Optico | 7891000000002 | Eletronicos | 39.90 | 4 |
| Cabo HDMI 2m | 7891000000003 | Eletronicos | 29.90 | 20 |
| Cafe Tradicional 500g | 7891000000004 | Alimentos | 18.50 | 30 |
| Luva Multiuso | 7891000000005 | Limpeza | 7.90 | 3 |

## Associacoes

| Produto | Fornecedor |
| --- | --- |
| Teclado USB | Tech Suprimentos |
| Mouse Optico | Tech Suprimentos |
| Cabo HDMI 2m | Tech Suprimentos |
| Cafe Tradicional 500g | Alimentos Brasil |
| Luva Multiuso | Distribuidora Central |

## Como carregar

Execute:

```bash
npm run seed
```

Depois acesse:

```text
http://127.0.0.1:3000/#/relatorios
```

## XML de NF-e para importacao manual

Tambem existe um XML de exemplo em:

```text
sample-data/nfe-exemplo.xml
```

Ele pode ser importado pela tela Produtos, no bloco "Importar nota fiscal".
