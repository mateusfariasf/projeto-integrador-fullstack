function mapAssociacao(row) {
  return {
    produtoId: row.produto_id,
    produtoNome: row.produto_nome,
    codigoBarras: row.codigo_barras,
    fornecedorId: row.fornecedor_id,
    nomeEmpresa: row.nome_empresa,
    cnpj: row.cnpj
  };
}

module.exports = {
  mapAssociacao
};
