const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");

const requiredFiles = [
  "src/server.js",
  "src/config/app.config.js",
  "src/database/connection.js",
  "src/database/schema.js",
  "src/routes/api.routes.js",
  "src/controllers/auth.controller.js",
  "src/controllers/estoque.controller.js",
  "src/controllers/public.controller.js",
  "src/services/auth.service.js",
  "src/services/estoque.service.js",
  "src/services/relatorios.service.js",
  "src/repositories/estoque.repository.js",
  "src/repositories/usuario.repository.js",
  "src/dtos/produto.dto.js",
  "src/dtos/fornecedor.dto.js",
  "src/validators/produto.validator.js",
  "src/validators/fornecedor.validator.js",
  "src/nosql/document-store.js",
  ".replit",
  "replit.nix",
  "public/index.html",
  "public/app.js",
  "public/styles.css",
  "docs/chamadas-insomnia.txt"
];

const requiredDirectories = [
  "src/config",
  "src/controllers",
  "src/database",
  "src/dtos",
  "src/nosql",
  "src/repositories",
  "src/routes",
  "src/services",
  "src/utils",
  "src/validators",
  "docs",
  "sample-data"
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Arquivo obrigatorio ausente: ${file}`);
}

for (const directory of requiredDirectories) {
  assert.ok(fs.statSync(path.join(root, directory)).isDirectory(), `Diretorio obrigatorio ausente: ${directory}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of ["start", "test", "seed", "review:code", "review:data"]) {
  assert.ok(packageJson.scripts[script], `Script npm ausente: ${script}`);
}

const serverLines = fs.readFileSync(path.join(root, "src/server.js"), "utf8").split(/\r?\n/).length;
assert.ok(serverLines <= 80, "src/server.js deve permanecer enxuto e delegar responsabilidades para modulos.");

const securitySource = fs.readFileSync(path.join(root, "src/utils/security.js"), "utf8");
assert.match(securitySource, /pbkdf2Sync/, "Hash de senha deve usar derivacao criptografica.");
assert.match(securitySource, /timingSafeEqual/, "Comparacao de senha deve usar comparacao segura.");

const appSource = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
assert.match(appSource, /openProdutoModal/, "Produto deve usar modal para cadastro/edicao.");
assert.match(appSource, /renderReportCharts/, "Relatorios devem possuir graficos de BI.");
assert.match(appSource, /exportarExcel/, "Relatorios devem possuir exportacao em Excel.");
assert.match(appSource, /exportarPdf/, "Relatorios devem possuir exportacao em PDF.");
assert.match(appSource, /exportarProdutosExcel/, "Produtos devem possuir exportacao em Excel.");
assert.match(appSource, /exportarFornecedoresExcel/, "Fornecedores devem possuir exportacao em Excel.");
assert.match(appSource, /exportarAssociacoesExcel/, "Associacoes devem possuir exportacao em Excel.");
assert.match(appSource, /openPasswordRecoveryModal/, "Login deve possuir recuperacao de senha demonstrativa.");
assert.match(appSource, /closeNotificationsOnOutsideClick/, "Notificacoes devem fechar ao clicar fora.");

const routesSource = fs.readFileSync(path.join(root, "src/routes/api.routes.js"), "utf8");
const publicSource = fs.readFileSync(path.join(root, "src/controllers/public.controller.js"), "utf8");
assert.match(routesSource, /handlePublicApi/, "API deve possuir rotas publicas para avaliacao academica.");
assert.match(publicSource, /api\/public\/produtos|produtos/, "API publica deve expor produtos.");
assert.match(publicSource, /fornecedores/, "API publica deve expor fornecedores.");
assert.match(publicSource, /associacoes/, "API publica deve expor associacoes.");
assert.match(publicSource, /gerarRelatorioEstoque/, "API publica deve expor relatorio de BI.");
assert.match(publicSource, /baixo-estoque/, "Fase 3 deve possuir endpoint novo de produtos com baixo estoque.");
assert.match(publicSource, /categorias/, "Fase 3 deve possuir endpoint novo de resumo por categorias.");

let trackedFiles = [];
try {
  trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
} catch {
  trackedFiles = [];
}

const forbiddenTracked = trackedFiles.filter((file) => (
  file.startsWith("data/")
  || file.endsWith(".sqlite")
  || file.endsWith(".db")
  || file === ".env"
  || file.endsWith(".log")
));
assert.deepEqual(forbiddenTracked, [], `Arquivos locais nao devem estar versionados: ${forbiddenTracked.join(", ")}`);

console.log("Code review automatico concluido com sucesso.");
