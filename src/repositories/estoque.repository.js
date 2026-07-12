const { mapFornecedor } = require("../dtos/fornecedor.dto");
const { mapProduto } = require("../dtos/produto.dto");
const { mapAssociacao } = require("../dtos/associacao.dto");
const { mapAtividade } = require("../dtos/atividade.dto");

function listFornecedores(db) {
  return db.prepare("SELECT * FROM fornecedores ORDER BY nome_empresa").all().map(mapFornecedor);
}

function getFornecedor(db, id) {
  const row = db.prepare("SELECT * FROM fornecedores WHERE id = ?").get(id);
  return row ? mapFornecedor(row) : null;
}

function findFornecedorByCnpj(db, cnpj, exceptId = null) {
  if (exceptId) return db.prepare("SELECT id FROM fornecedores WHERE cnpj = ? AND id <> ?").get(cnpj, exceptId);
  return db.prepare("SELECT id FROM fornecedores WHERE cnpj = ?").get(cnpj);
}

function createFornecedor(db, data) {
  const result = db.prepare(`
    INSERT INTO fornecedores (nome_empresa, cnpj, endereco, telefone, email, contato_principal)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.nomeEmpresa, data.cnpj, data.endereco, data.telefone, data.email, data.contatoPrincipal);
  return getFornecedor(db, result.lastInsertRowid);
}

function updateFornecedor(db, id, data) {
  db.prepare(`
    UPDATE fornecedores
    SET nome_empresa = ?, cnpj = ?, endereco = ?, telefone = ?, email = ?, contato_principal = ?
    WHERE id = ?
  `).run(data.nomeEmpresa, data.cnpj, data.endereco, data.telefone, data.email, data.contatoPrincipal, id);
  return getFornecedor(db, id);
}

function deleteFornecedor(db, id) {
  return db.prepare("DELETE FROM fornecedores WHERE id = ?").run(id).changes;
}

function listProdutos(db) {
  return db.prepare("SELECT * FROM produtos ORDER BY nome").all().map(mapProduto);
}

function getProduto(db, id) {
  const row = db.prepare("SELECT * FROM produtos WHERE id = ?").get(id);
  return row ? mapProduto(row) : null;
}

function findProdutoRowByCodigoBarras(db, codigoBarras) {
  return db.prepare("SELECT * FROM produtos WHERE codigo_barras = ?").get(codigoBarras);
}

function findProdutoByCodigoBarras(db, codigoBarras, exceptId = null) {
  if (exceptId) return db.prepare("SELECT id FROM produtos WHERE codigo_barras = ? AND id <> ?").get(codigoBarras, exceptId);
  return db.prepare("SELECT id FROM produtos WHERE codigo_barras = ?").get(codigoBarras);
}

function createProduto(db, data) {
  const result = db.prepare(`
    INSERT INTO produtos (nome, codigo_barras, descricao, preco, quantidade, categoria, data_validade, imagem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(data.nome, data.codigoBarras, data.descricao, data.preco, data.quantidade, data.categoria, data.dataValidade || "", data.imagem || "");
  return getProduto(db, result.lastInsertRowid);
}

function updateProduto(db, id, data) {
  db.prepare(`
    UPDATE produtos
    SET nome = ?, codigo_barras = ?, descricao = ?, preco = ?, quantidade = ?, categoria = ?, data_validade = ?, imagem = ?
    WHERE id = ?
  `).run(data.nome, data.codigoBarras, data.descricao, data.preco, data.quantidade, data.categoria, data.dataValidade || "", data.imagem || "", id);
  return getProduto(db, id);
}

function updateProdutoImportado(db, id, data, novaQuantidade) {
  db.prepare(`
    UPDATE produtos
    SET nome = ?, descricao = ?, preco = ?, quantidade = ?, categoria = ?, data_validade = COALESCE(NULLIF(?, ''), data_validade)
    WHERE id = ?
  `).run(data.nome, data.descricao, data.preco, novaQuantidade, data.categoria, data.dataValidade || "", id);
  return getProduto(db, id);
}

function deleteProduto(db, id) {
  return db.prepare("DELETE FROM produtos WHERE id = ?").run(id).changes;
}

function fornecedoresPorProduto(db, produtoId) {
  return db.prepare(`
    SELECT f.* FROM fornecedores f
    INNER JOIN produto_fornecedor pf ON pf.fornecedor_id = f.id
    WHERE pf.produto_id = ?
    ORDER BY f.nome_empresa
  `).all(produtoId).map(mapFornecedor);
}

function produtosPorFornecedor(db, fornecedorId) {
  return db.prepare(`
    SELECT p.* FROM produtos p
    INNER JOIN produto_fornecedor pf ON pf.produto_id = p.id
    WHERE pf.fornecedor_id = ?
    ORDER BY p.nome
  `).all(fornecedorId).map(mapProduto);
}

function listAssociacoes(db) {
  return db.prepare(`
    SELECT
      p.id AS produto_id,
      p.nome AS produto_nome,
      p.codigo_barras,
      f.id AS fornecedor_id,
      f.nome_empresa,
      f.cnpj
    FROM produto_fornecedor pf
    INNER JOIN produtos p ON p.id = pf.produto_id
    INNER JOIN fornecedores f ON f.id = pf.fornecedor_id
    ORDER BY p.nome, f.nome_empresa
  `).all().map(mapAssociacao);
}

function associacaoExists(db, produtoId, fornecedorId) {
  return db.prepare("SELECT 1 FROM produto_fornecedor WHERE produto_id = ? AND fornecedor_id = ?").get(produtoId, fornecedorId);
}

function createAssociacao(db, produtoId, fornecedorId) {
  db.prepare("INSERT INTO produto_fornecedor (produto_id, fornecedor_id) VALUES (?, ?)").run(produtoId, fornecedorId);
}

function deleteAssociacao(db, produtoId, fornecedorId) {
  return db.prepare("DELETE FROM produto_fornecedor WHERE produto_id = ? AND fornecedor_id = ?").run(produtoId, fornecedorId).changes;
}

function listAtividades(db) {
  return db.prepare(`
    SELECT
      a.*,
      u.nome AS usuario_nome
    FROM atividades a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.id DESC
    LIMIT 30
  `).all().map(mapAtividade);
}

function registrarAtividade(db, { tipo, entidade, entidadeId, titulo, detalhe = "", origem = "manual", usuarioId = null }) {
  db.prepare(`
    INSERT INTO atividades (tipo, entidade, entidade_id, titulo, detalhe, origem, usuario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(tipo, entidade, entidadeId, titulo, detalhe, origem, usuarioId);
}

module.exports = {
  listFornecedores,
  getFornecedor,
  findFornecedorByCnpj,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
  listProdutos,
  getProduto,
  findProdutoRowByCodigoBarras,
  findProdutoByCodigoBarras,
  createProduto,
  updateProduto,
  updateProdutoImportado,
  deleteProduto,
  fornecedoresPorProduto,
  produtosPorFornecedor,
  listAssociacoes,
  associacaoExists,
  createAssociacao,
  deleteAssociacao,
  listAtividades,
  registrarAtividade
};
