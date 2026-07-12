const http = require("http");
const { PORT, PUBLIC_DIR } = require("./config/app.config");
const { openDatabase } = require("./database/connection");
const { routeRequest } = require("./routes/app.routes");
const { sendJson } = require("./utils/http");

function createApp({ db = openDatabase(), publicDir = PUBLIC_DIR } = {}) {
  return http.createServer(async (req, res) => {
    try {
      await routeRequest(req, res, db, publicDir);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { mensagem: "Erro interno do servidor." });
    }
  });
}

if (require.main === module) {
  const server = createApp();
  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/`);
  });
}

module.exports = {
  createApp,
  openDatabase
};
