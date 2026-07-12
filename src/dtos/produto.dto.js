function mapProduto(row) {
  return {
    id: row.id,
    nome: row.nome,
    codigoBarras: row.codigo_barras,
    descricao: row.descricao,
    preco: row.preco,
    quantidade: row.quantidade,
    categoria: row.categoria,
    dataValidade: row.data_validade || "",
    imagem: row.imagem || "",
    criadoEm: row.criado_em
  };
}

module.exports = {
  mapProduto
};
