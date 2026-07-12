const estoqueService = require("../services/estoque.service");
const { readJson, sendJson } = require("../utils/http");

async function handleFornecedores(req, res, db, method, parts, usuario) {
  const id = Number(parts[2]);

  if (method === "GET" && parts.length === 2) return sendJson(res, 200, estoqueService.listFornecedores(db));
  if (method === "GET" && parts.length === 3) {
    const fornecedor = estoqueService.getFornecedor(db, id);
    return sendJson(res, fornecedor ? 200 : 404, fornecedor || { mensagem: "Fornecedor nao encontrado." });
  }
  if (method === "GET" && parts.length === 4 && parts[3] === "produtos") {
    return sendJson(res, 200, estoqueService.produtosPorFornecedor(db, id));
  }
  if (method === "POST" && parts.length === 2) {
    const result = estoqueService.createFornecedor(db, await readJson(req), usuario);
    return sendJson(res, result.status, result.payload);
  }
  if (method === "PUT" && parts.length === 3) {
    const result = estoqueService.updateFornecedor(db, id, await readJson(req), usuario);
    return sendJson(res, result.status, result.payload);
  }
  if (method === "DELETE" && parts.length === 3) {
    const result = estoqueService.deleteFornecedor(db, id);
    return sendJson(res, result.status, result.payload);
  }

  sendJson(res, 404, { mensagem: "Rota de fornecedor nao encontrada." });
}

async function handleProdutos(req, res, db, method, parts, usuario) {
  const id = Number(parts[2]);

  if (method === "GET" && parts.length === 2) return sendJson(res, 200, estoqueService.listProdutos(db));
  if (method === "GET" && parts.length === 3) {
    const produto = estoqueService.getProduto(db, id);
    return sendJson(res, produto ? 200 : 404, produto || { mensagem: "Produto nao encontrado." });
  }
  if (method === "GET" && parts.length === 4 && parts[3] === "fornecedores") {
    return sendJson(res, 200, estoqueService.fornecedoresPorProduto(db, id));
  }
  if (method === "POST" && parts.length === 2) {
    const result = estoqueService.createProduto(db, await readJson(req), usuario);
    return sendJson(res, result.status, result.payload);
  }
  if (method === "PUT" && parts.length === 3) {
    const result = estoqueService.updateProduto(db, id, await readJson(req), usuario);
    return sendJson(res, result.status, result.payload);
  }
  if (method === "DELETE" && parts.length === 3) {
    const result = estoqueService.deleteProduto(db, id);
    return sendJson(res, result.status, result.payload);
  }
  if (parts.length === 5 && parts[3] === "fornecedores") {
    const produtoId = Number(parts[2]);
    const fornecedorId = Number(parts[4]);
    const result = method === "POST"
      ? estoqueService.associarFornecedor(db, produtoId, fornecedorId, usuario)
      : method === "DELETE"
        ? estoqueService.removerAssociacao(db, produtoId, fornecedorId)
        : null;
    if (result) return sendJson(res, result.status, result.payload);
  }

  sendJson(res, 404, { mensagem: "Rota de produto nao encontrada." });
}

async function handleImportacaoNota(req, res, db, usuario) {
  const result = estoqueService.importarNotaFiscal(db, await readJson(req), usuario);
  sendJson(res, result.status, result.payload);
}

function handleMockupSeed(res, db, usuario) {
  const result = estoqueService.seedMockups(db, usuario);
  sendJson(res, result.status, result.payload);
}

module.exports = {
  handleFornecedores,
  handleProdutos,
  handleImportacaoNota,
  handleMockupSeed
};
