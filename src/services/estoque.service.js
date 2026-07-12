const fs = require("fs");
const { SAMPLE_DATA_PATH } = require("../config/app.config");
const repo = require("../repositories/estoque.repository");
const { validateFornecedor } = require("../validators/fornecedor.validator");
const { validateProduto } = require("../validators/produto.validator");

function listFornecedores(db) {
  return repo.listFornecedores(db);
}

function getFornecedor(db, id) {
  return repo.getFornecedor(db, id);
}

function createFornecedor(db, body, usuario) {
  const data = normalizeFornecedor(body);
  const validation = validateFornecedor(data);
  if (!validation.ok) return { status: 400, payload: validation };

  if (repo.findFornecedorByCnpj(db, data.cnpj)) {
    return { status: 409, payload: { mensagem: "Fornecedor com esse CNPJ ja esta cadastrado!" } };
  }

  const fornecedor = repo.createFornecedor(db, data);
  repo.registrarAtividade(db, {
    tipo: "cadastro",
    entidade: "fornecedor",
    entidadeId: fornecedor.id,
    titulo: fornecedor.nomeEmpresa,
    detalhe: fornecedor.cnpj,
    origem: "manual",
    usuarioId: usuario.id
  });
  return { status: 201, payload: { mensagem: "Fornecedor cadastrado com sucesso!", fornecedor } };
}

function updateFornecedor(db, id, body, usuario) {
  const data = normalizeFornecedor(body);
  const validation = validateFornecedor(data);
  if (!validation.ok) return { status: 400, payload: validation };

  if (!repo.getFornecedor(db, id)) return { status: 404, payload: { mensagem: "Fornecedor nao encontrado." } };
  if (repo.findFornecedorByCnpj(db, data.cnpj, id)) {
    return { status: 409, payload: { mensagem: "Fornecedor com esse CNPJ ja esta cadastrado!" } };
  }

  const fornecedor = repo.updateFornecedor(db, id, data);
  repo.registrarAtividade(db, {
    tipo: "atualizacao",
    entidade: "fornecedor",
    entidadeId: id,
    titulo: fornecedor.nomeEmpresa,
    detalhe: fornecedor.cnpj,
    origem: "manual",
    usuarioId: usuario.id
  });
  return { status: 200, payload: { mensagem: "Fornecedor atualizado com sucesso!", fornecedor } };
}

function deleteFornecedor(db, id) {
  const changes = repo.deleteFornecedor(db, id);
  return changes
    ? { status: 200, payload: { mensagem: "Fornecedor removido com sucesso!" } }
    : { status: 404, payload: { mensagem: "Fornecedor nao encontrado." } };
}

function listProdutos(db) {
  return repo.listProdutos(db);
}

function getProduto(db, id) {
  return repo.getProduto(db, id);
}

function createProduto(db, body, usuario) {
  const data = normalizeProduto(body);
  const validation = validateProduto(data);
  if (!validation.ok) return { status: 400, payload: validation };

  if (repo.findProdutoByCodigoBarras(db, data.codigoBarras)) {
    return { status: 409, payload: { mensagem: "Produto com este codigo de barras ja esta cadastrado!" } };
  }

  const produto = repo.createProduto(db, data);
  repo.registrarAtividade(db, {
    tipo: "cadastro",
    entidade: "produto",
    entidadeId: produto.id,
    titulo: produto.nome,
    detalhe: `${produto.quantidade} unidade(s) - codigo ${produto.codigoBarras}`,
    origem: "manual",
    usuarioId: usuario.id
  });
  return { status: 201, payload: { mensagem: "Produto cadastrado com sucesso!", produto } };
}

function updateProduto(db, id, body, usuario) {
  const data = normalizeProduto(body);
  const validation = validateProduto(data);
  if (!validation.ok) return { status: 400, payload: validation };

  if (!repo.getProduto(db, id)) return { status: 404, payload: { mensagem: "Produto nao encontrado." } };
  if (repo.findProdutoByCodigoBarras(db, data.codigoBarras, id)) {
    return { status: 409, payload: { mensagem: "Produto com este codigo de barras ja esta cadastrado!" } };
  }

  const produto = repo.updateProduto(db, id, data);
  repo.registrarAtividade(db, {
    tipo: "atualizacao",
    entidade: "produto",
    entidadeId: id,
    titulo: produto.nome,
    detalhe: `${produto.quantidade} unidade(s) - codigo ${produto.codigoBarras}`,
    origem: "manual",
    usuarioId: usuario.id
  });
  return { status: 200, payload: { mensagem: "Produto atualizado com sucesso!", produto } };
}

function deleteProduto(db, id) {
  const changes = repo.deleteProduto(db, id);
  return changes
    ? { status: 200, payload: { mensagem: "Produto removido com sucesso!" } }
    : { status: 404, payload: { mensagem: "Produto nao encontrado." } };
}

function associarFornecedor(db, produtoId, fornecedorId, usuario) {
  const produto = repo.getProduto(db, produtoId);
  const fornecedor = repo.getFornecedor(db, fornecedorId);
  if (!produto || !fornecedor) return { status: 404, payload: { mensagem: "Produto ou fornecedor nao encontrado." } };
  if (repo.associacaoExists(db, produtoId, fornecedorId)) {
    return { status: 409, payload: { mensagem: "Fornecedor ja esta associado a este produto!" } };
  }

  repo.createAssociacao(db, produtoId, fornecedorId);
  repo.registrarAtividade(db, {
    tipo: "associacao",
    entidade: "produto_fornecedor",
    entidadeId: produtoId,
    titulo: `${produto.nome} + ${fornecedor.nomeEmpresa}`,
    detalhe: "Fornecedor associado ao produto.",
    origem: "manual",
    usuarioId: usuario.id
  });
  return { status: 201, payload: { mensagem: "Fornecedor associado com sucesso ao produto!" } };
}

function removerAssociacao(db, produtoId, fornecedorId) {
  const changes = repo.deleteAssociacao(db, produtoId, fornecedorId);
  return changes
    ? { status: 200, payload: { mensagem: "Fornecedor desassociado com sucesso!" } }
    : { status: 404, payload: { mensagem: "Associacao nao encontrada." } };
}

function importarNotaFiscal(db, body, usuario) {
  const produtos = Array.isArray(body.produtos) ? body.produtos : [];
  const fornecedorPayload = body.fornecedor || null;
  const numeroNota = String(body.numeroNota || "").trim();
  const origem = numeroNota ? `nota fiscal ${numeroNota}` : "nota fiscal";

  if (!produtos.length) return { status: 400, payload: { mensagem: "Nenhum produto encontrado para importar." } };

  let fornecedor = null;
  if (fornecedorPayload?.cnpj && fornecedorPayload?.nomeEmpresa) {
    fornecedor = upsertFornecedorImportado(db, fornecedorPayload, usuario.id, origem);
  }

  const resumo = {
    produtosCriados: 0,
    produtosAtualizados: 0,
    fornecedoresCriados: fornecedor?.criado ? 1 : 0,
    associacoesCriadas: 0,
    ignorados: []
  };

  for (let index = 0; index < produtos.length; index += 1) {
    const normalizado = normalizeProdutoImportado(produtos[index], index);
    const validation = validateProduto(normalizado);
    if (!validation.ok) {
      resumo.ignorados.push({ linha: index + 1, nome: produtos[index]?.nome || "", erros: validation.errors });
      continue;
    }

    const existente = repo.findProdutoRowByCodigoBarras(db, normalizado.codigoBarras);
    let produto;
    if (existente) {
      const novaQuantidade = Number(existente.quantidade || 0) + Number(normalizado.quantidade || 0);
      produto = repo.updateProdutoImportado(db, existente.id, normalizado, novaQuantidade);
      resumo.produtosAtualizados += 1;
    } else {
      produto = repo.createProduto(db, normalizado);
      resumo.produtosCriados += 1;
    }

    repo.registrarAtividade(db, {
      tipo: existente ? "atualizacao" : "cadastro",
      entidade: "produto",
      entidadeId: produto.id,
      titulo: produto.nome,
      detalhe: `${produto.quantidade} unidade(s) - ${origem}`,
      origem,
      usuarioId: usuario.id
    });

    if (fornecedor?.id && !repo.associacaoExists(db, produto.id, fornecedor.id)) {
      repo.createAssociacao(db, produto.id, fornecedor.id);
      resumo.associacoesCriadas += 1;
    }
  }

  repo.registrarAtividade(db, {
    tipo: "importacao",
    entidade: "nota_fiscal",
    entidadeId: null,
    titulo: numeroNota ? `Nota fiscal ${numeroNota}` : "Importacao de nota fiscal",
    detalhe: `${resumo.produtosCriados} criado(s), ${resumo.produtosAtualizados} atualizado(s), ${resumo.ignorados.length} ignorado(s).`,
    origem,
    usuarioId: usuario.id
  });

  return { status: 201, payload: { mensagem: "Nota fiscal importada com sucesso.", resumo } };
}

function seedMockups(db, usuario) {
  const data = JSON.parse(fs.readFileSync(SAMPLE_DATA_PATH, "utf8"));
  const resumo = seedMockupData(db, data, usuario.id);
  repo.registrarAtividade(db, {
    tipo: "importacao",
    entidade: "mockup",
    entidadeId: null,
    titulo: "Dados falsos carregados",
    detalhe: `${resumo.produtos} produto(s), ${resumo.fornecedores} fornecedor(es) e ${resumo.associacoesCriadas} associacao(oes) nova(s).`,
    origem: "mockups",
    usuarioId: usuario.id
  });
  return { status: 201, payload: { mensagem: "Dados falsos carregados com sucesso.", resumo } };
}

function seedMockupData(db, data, usuarioId) {
  const fornecedorIds = new Map();
  const produtoIds = new Map();
  let associacoesCriadas = 0;

  for (const fornecedor of data.fornecedores || []) {
    const id = upsertFornecedorMockup(db, fornecedor, usuarioId);
    fornecedorIds.set(fornecedor.cnpj, id);
  }

  for (const produto of data.produtos || []) {
    const id = upsertProdutoMockup(db, produto, usuarioId);
    produtoIds.set(produto.codigoBarras, id);
  }

  for (const [codigoBarras, cnpj] of data.associacoes || []) {
    const produtoId = produtoIds.get(codigoBarras) || repo.findProdutoByCodigoBarras(db, codigoBarras)?.id;
    const fornecedorId = fornecedorIds.get(cnpj) || repo.findFornecedorByCnpj(db, cnpj)?.id;
    if (!produtoId || !fornecedorId || repo.associacaoExists(db, produtoId, fornecedorId)) continue;
    repo.createAssociacao(db, produtoId, fornecedorId);
    associacoesCriadas += 1;
  }

  return {
    fornecedores: (data.fornecedores || []).length,
    produtos: (data.produtos || []).length,
    associacoesCriadas
  };
}

function upsertFornecedorImportado(db, payload, usuarioId, origem) {
  const data = {
    nomeEmpresa: String(payload.nomeEmpresa || "").trim(),
    cnpj: String(payload.cnpj || "").trim(),
    endereco: String(payload.endereco || "Endereco nao informado").trim(),
    telefone: String(payload.telefone || "(00) 0000-0000").trim(),
    email: String(payload.email || "sem-email@fornecedor.local").trim(),
    contatoPrincipal: String(payload.contatoPrincipal || payload.nomeEmpresa || "Fornecedor").trim()
  };
  const existente = repo.findFornecedorByCnpj(db, data.cnpj);
  if (existente) return { ...repo.getFornecedor(db, existente.id), criado: false };

  const fornecedor = repo.createFornecedor(db, data);
  repo.registrarAtividade(db, {
    tipo: "cadastro",
    entidade: "fornecedor",
    entidadeId: fornecedor.id,
    titulo: fornecedor.nomeEmpresa,
    detalhe: fornecedor.cnpj,
    origem,
    usuarioId
  });
  return { ...fornecedor, criado: true };
}

function upsertFornecedorMockup(db, item, usuarioId) {
  const existing = repo.findFornecedorByCnpj(db, item.cnpj);
  if (existing) return existing.id;
  const fornecedor = repo.createFornecedor(db, normalizeFornecedor(item));
  repo.registrarAtividade(db, {
    tipo: "cadastro",
    entidade: "fornecedor",
    entidadeId: fornecedor.id,
    titulo: fornecedor.nomeEmpresa,
    detalhe: fornecedor.cnpj,
    origem: "mockups",
    usuarioId
  });
  return fornecedor.id;
}

function upsertProdutoMockup(db, item, usuarioId) {
  const existing = repo.findProdutoByCodigoBarras(db, item.codigoBarras);
  if (existing) return existing.id;
  const produto = repo.createProduto(db, normalizeProduto({ ...item, dataValidade: "", imagem: "" }));
  repo.registrarAtividade(db, {
    tipo: "cadastro",
    entidade: "produto",
    entidadeId: produto.id,
    titulo: produto.nome,
    detalhe: `${produto.quantidade} unidade(s) - codigo ${produto.codigoBarras}`,
    origem: "mockups",
    usuarioId
  });
  return produto.id;
}

function normalizeFornecedor(data) {
  return {
    nomeEmpresa: String(data.nomeEmpresa || "").trim(),
    cnpj: String(data.cnpj || "").trim(),
    endereco: String(data.endereco || "").trim(),
    telefone: String(data.telefone || "").trim(),
    email: String(data.email || "").trim(),
    contatoPrincipal: String(data.contatoPrincipal || "").trim()
  };
}

function normalizeProduto(data) {
  return {
    nome: String(data.nome || "").trim(),
    codigoBarras: String(data.codigoBarras || "").trim(),
    descricao: String(data.descricao || "").trim(),
    preco: Number(data.preco || 0),
    quantidade: Number(data.quantidade || 0),
    categoria: String(data.categoria || "").trim(),
    dataValidade: String(data.dataValidade || "").trim(),
    imagem: data.imagem || ""
  };
}

function normalizeProdutoImportado(item, index) {
  const codigoBase = String(item.codigoBarras || item.codigo || item.cProd || "").trim();
  const codigoNumerico = codigoBase.replace(/\D/g, "");
  const codigoBarras = codigoNumerico || String(Date.now()).slice(-10) + String(index + 1).padStart(3, "0");
  return normalizeProduto({
    nome: item.nome || item.xProd || `Produto importado ${index + 1}`,
    codigoBarras,
    descricao: item.descricao || item.nome || item.xProd || "Produto importado de nota fiscal",
    preco: item.preco ?? item.vUnCom ?? item.valorUnitario ?? 0,
    quantidade: item.quantidade ?? item.qCom ?? 1,
    categoria: item.categoria || item.ncm || "Importado da NF-e",
    dataValidade: item.dataValidade || "",
    imagem: ""
  });
}

module.exports = {
  listFornecedores,
  getFornecedor,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
  listProdutos,
  getProduto,
  createProduto,
  updateProduto,
  deleteProduto,
  fornecedoresPorProduto: repo.fornecedoresPorProduto,
  produtosPorFornecedor: repo.produtosPorFornecedor,
  listAssociacoes: repo.listAssociacoes,
  listAtividades: repo.listAtividades,
  associarFornecedor,
  removerAssociacao,
  importarNotaFiscal,
  seedMockups,
  seedMockupData
};
