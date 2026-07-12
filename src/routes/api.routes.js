const { handleAuth } = require("../controllers/auth.controller");
const {
  handleFornecedores,
  handleImportacaoNota,
  handleMockupSeed,
  handleProdutos
} = require("../controllers/estoque.controller");
const { handlePublicApi } = require("../controllers/public.controller");
const authService = require("../services/auth.service");
const estoqueService = require("../services/estoque.service");
const relatoriosService = require("../services/relatorios.service");
const { sendJson } = require("../utils/http");

async function routeApi(req, res, db, url) {
  const method = req.method;
  const parts = url.pathname.split("/").filter(Boolean);

  if (method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (parts[1] === "public") {
    handlePublicApi(res, db, method, parts);
    return;
  }

  if (parts[1] === "auth") {
    await handleAuth(req, res, db, method, parts);
    return;
  }

  const usuario = authService.getCurrentUser(req, db);
  if (!usuario) {
    sendJson(res, 401, { mensagem: "Login necessario para acessar o sistema." });
    return;
  }

  if (parts[1] === "fornecedores") {
    await handleFornecedores(req, res, db, method, parts, usuario);
    return;
  }

  if (parts[1] === "produtos") {
    await handleProdutos(req, res, db, method, parts, usuario);
    return;
  }

  if (method === "GET" && url.pathname === "/api/associacoes") {
    sendJson(res, 200, estoqueService.listAssociacoes(db));
    return;
  }

  if (method === "GET" && url.pathname === "/api/atividades") {
    sendJson(res, 200, estoqueService.listAtividades(db));
    return;
  }

  if (method === "GET" && url.pathname === "/api/relatorios") {
    sendJson(res, 200, relatoriosService.gerarRelatorioEstoque(db));
    return;
  }

  if (method === "GET" && url.pathname === "/api/relatorios/snapshots") {
    sendJson(res, 200, relatoriosService.listarSnapshotsRelatorios());
    return;
  }

  if (method === "POST" && url.pathname === "/api/importacoes/nota") {
    await handleImportacaoNota(req, res, db, usuario);
    return;
  }

  if (method === "POST" && url.pathname === "/api/mockups/seed") {
    handleMockupSeed(res, db, usuario);
    return;
  }

  sendJson(res, 404, { mensagem: "Rota nao encontrada." });
}

module.exports = {
  routeApi
};
