function mapFornecedor(row) {
  return {
    id: row.id,
    nomeEmpresa: row.nome_empresa,
    cnpj: row.cnpj,
    endereco: row.endereco,
    telefone: row.telefone,
    email: row.email,
    contatoPrincipal: row.contato_principal,
    criadoEm: row.criado_em
  };
}

module.exports = {
  mapFornecedor
};
