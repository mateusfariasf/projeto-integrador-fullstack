function mapAtividade(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    entidade: row.entidade,
    entidadeId: row.entidade_id,
    titulo: row.titulo,
    detalhe: row.detalhe || "",
    origem: row.origem,
    usuarioNome: row.usuario_nome || "Sistema",
    criadoEm: row.criado_em
  };
}

module.exports = {
  mapAtividade
};
