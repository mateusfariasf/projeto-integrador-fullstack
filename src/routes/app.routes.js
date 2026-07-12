const { routeApi } = require("./api.routes");
const { sendJson, sendNoContent, serveStatic } = require("../utils/http");

async function routeRequest(req, res, db, publicDir) {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await routeApi(req, res, db, url);
    return;
  }

  try {
    serveStatic(res, publicDir, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { mensagem: "Erro interno do servidor." });
  }
}

module.exports = {
  routeRequest
};
