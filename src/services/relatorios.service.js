const repo = require("../repositories/estoque.repository");
const { DocumentStore } = require("../nosql/document-store");

const documentStore = new DocumentStore();

function gerarRelatorioEstoque(db, { persistirSnapshot = true } = {}) {
  const produtos = repo.listProdutos(db);
  const fornecedores = repo.listFornecedores(db);
  const associacoes = repo.listAssociacoes(db);
  const atividades = repo.listAtividades(db);
  const categorias = agruparCategorias(produtos);
  const baixoEstoque = produtos
    .filter((produto) => Number(produto.quantidade || 0) <= 5)
    .sort((a, b) => Number(a.quantidade || 0) - Number(b.quantidade || 0));

  const produtosAssociados = new Set(associacoes.map((item) => item.produtoId));
  const fornecedoresAssociados = new Set(associacoes.map((item) => item.fornecedorId));
  const valorTotalEstoque = produtos.reduce((total, produto) => total + Number(produto.preco || 0) * Number(produto.quantidade || 0), 0);

  const relatorio = {
    geradoEm: new Date().toISOString(),
    indicadores: {
      totalProdutos: produtos.length,
      totalFornecedores: fornecedores.length,
      totalAssociacoes: associacoes.length,
      valorTotalEstoque,
      produtosBaixoEstoque: baixoEstoque.length,
      produtosSemFornecedor: produtos.filter((produto) => !produtosAssociados.has(produto.id)).length,
      fornecedoresSemProduto: fornecedores.filter((fornecedor) => !fornecedoresAssociados.has(fornecedor.id)).length
    },
    dimensoes: {
      categorias
    },
    alertas: {
      baixoEstoque: baixoEstoque.slice(0, 10),
      ultimasAtividades: atividades.slice(0, 10)
    }
  };

  if (persistirSnapshot) {
    documentStore.insert("relatorios_estoque", {
      tipo: "snapshot-relatorio-estoque",
      indicadores: relatorio.indicadores,
      dimensoes: relatorio.dimensoes,
      alertas: {
        produtosBaixoEstoque: relatorio.alertas.baixoEstoque.map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          quantidade: produto.quantidade
        }))
      }
    });
  }

  return relatorio;
}

function listarSnapshotsRelatorios() {
  return documentStore.list("relatorios_estoque").slice(-20).reverse();
}

function agruparCategorias(produtos) {
  const grupos = new Map();
  for (const produto of produtos) {
    const categoria = produto.categoria || "Sem categoria";
    const atual = grupos.get(categoria) || { categoria, produtos: 0, unidades: 0, valorEstoque: 0 };
    atual.produtos += 1;
    atual.unidades += Number(produto.quantidade || 0);
    atual.valorEstoque += Number(produto.preco || 0) * Number(produto.quantidade || 0);
    grupos.set(categoria, atual);
  }
  return [...grupos.values()].sort((a, b) => b.valorEstoque - a.valorEstoque);
}

module.exports = {
  gerarRelatorioEstoque,
  listarSnapshotsRelatorios
};
