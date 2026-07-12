function mapUsuario(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    provedor: row.provedor
  };
}

module.exports = {
  mapUsuario
};
