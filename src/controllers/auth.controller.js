const authService = require("../services/auth.service");
const { readJson, sendJson } = require("../utils/http");

async function handleAuth(req, res, db, method, parts) {
  if (method === "GET" && parts[2] === "me") {
    const usuario = authService.getCurrentUser(req, db);
    sendJson(res, usuario ? 200 : 401, usuario ? { usuario } : { mensagem: "Sessao invalida ou expirada." });
    return;
  }

  if (method === "POST" && parts[2] === "login") {
    const result = authService.login(db, await readJson(req));
    sendJson(res, result.status, result.payload);
    return;
  }

  if (method === "POST" && parts[2] === "register") {
    const result = authService.register(db, await readJson(req));
    sendJson(res, result.status, result.payload);
    return;
  }

  if (method === "POST" && parts[2] === "google-demo") {
    const result = authService.googleDemoLogin(db);
    sendJson(res, result.status, result.payload);
    return;
  }

  if (method === "POST" && parts[2] === "logout") {
    const result = authService.logout(db, req);
    sendJson(res, result.status, result.payload);
    return;
  }

  sendJson(res, 404, { mensagem: "Rota de autenticacao nao encontrada." });
}

module.exports = {
  handleAuth
};
