# Revisao de Dados

## Objetivo

Validar se os dados simulados usados na demonstracao sao coerentes e seguros para testes.

## Arquivos avaliados

- `sample-data/dados-simulatorios.json`
- `sample-data/nfe-exemplo.xml`

## Regras verificadas

| Regra | Validacao |
| --- | --- |
| Fornecedores existem | Lista deve possuir pelo menos 3 fornecedores |
| Produtos existem | Lista deve possuir pelo menos 5 produtos |
| CNPJ valido | Formato `00.000.000/0000-00` |
| CNPJ unico | Nao pode repetir fornecedor |
| Codigo de barras numerico | Produto deve usar apenas numeros |
| Codigo de barras unico | Nao pode repetir produto |
| Preco valido | Preco deve ser maior ou igual a zero |
| Quantidade valida | Quantidade deve ser maior ou igual a zero |
| Associacoes validas | Produto e fornecedor referenciados devem existir |
| NF-e de exemplo | Deve possuir emitente e itens de produto |

## Comando

```powershell
npm.cmd run review:data
```

## Conclusao

A massa de dados atual atende ao objetivo de demonstracao. Ela cobre fornecedores, produtos, associacoes, categorias distintas, baixo estoque e importacao por NF-e.

## Melhorias futuras

- Adicionar produtos com estoque zerado.
- Adicionar mais categorias para enriquecer os graficos.
- Criar cenarios especificos de fornecedor sem produto e produto sem fornecedor.
