const estoqueService = require("../services/estoque.service");
const relatoriosService = require("../services/relatorios.service");
const { sendJson } = require("../utils/http");

function handlePublicApi(res, db, method, parts) {
  if (method !== "GET") {
    sendJson(res, 405, { mensagem: "Metodo nao permitido para a API publica de entrega." });
    return;
  }

  ensurePublicDemoData(db);

  if (parts[2] === "produtos" && parts[3] === "baixo-estoque") {
    const produtos = estoqueService.listProdutos(db)
      .filter((produto) => Number(produto.quantidade || 0) <= 5)
      .sort((a, b) => Number(a.quantidade || 0) - Number(b.quantidade || 0));

    sendJson(res, 200, {
      descricao: "Produtos com baixo estoque para priorizacao de reposicao.",
      criterio: "quantidade menor ou igual a 5 unidades",
      total: produtos.length,
      dados: produtos
    });
    return;
  }

  if (parts[2] === "produtos") {
    sendJson(res, 200, {
      descricao: "Lista publica de produtos para avaliacao REST no Insomnia.",
      total: estoqueService.listProdutos(db).length,
      dados: estoqueService.listProdutos(db)
    });
    return;
  }

  if (parts[2] === "fornecedores") {
    sendJson(res, 200, {
      descricao: "Lista publica de fornecedores para avaliacao REST no Insomnia.",
      total: estoqueService.listFornecedores(db).length,
      dados: estoqueService.listFornecedores(db)
    });
    return;
  }

  if (parts[2] === "associacoes") {
    sendJson(res, 200, {
      descricao: "Relacionamentos publicos entre produtos e fornecedores.",
      total: estoqueService.listAssociacoes(db).length,
      dados: estoqueService.listAssociacoes(db)
    });
    return;
  }

  if (parts[2] === "categorias" && parts[3] === "resumo") {
    const relatorio = relatoriosService.gerarRelatorioEstoque(db, { persistirSnapshot: false });

    sendJson(res, 200, {
      descricao: "Resumo de estoque por categoria para apoio a inteligencia de negocio.",
      total: relatorio.dimensoes.categorias.length,
      dados: relatorio.dimensoes.categorias
    });
    return;
  }

  if (parts[2] === "relatorios") {
    sendJson(res, 200, {
      descricao: "Relatorio publico de inteligencia de negocio para avaliacao REST.",
      dados: relatoriosService.gerarRelatorioEstoque(db, { persistirSnapshot: false })
    });
    return;
  }

  sendJson(res, 404, { mensagem: "Rota publica nao encontrada." });
}

function ensurePublicDemoData(db) {
  const produtos = estoqueService.listProdutos(db);
  const fornecedores = estoqueService.listFornecedores(db);
  if (produtos.length && fornecedores.length) return;

  const usuario = db.prepare("SELECT id FROM usuarios ORDER BY id LIMIT 1").get() || { id: null };
  estoqueService.seedMockups(db, usuario);
}

module.exports = {
  handlePublicApi
};
