const fs = require("fs");
const path = require("path");
const { openDatabase } = require("../src/server");
const { seedMockupData } = require("../src/services/estoque.service");

const db = openDatabase();
const dataPath = path.join(__dirname, "..", "sample-data", "dados-simulatorios.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const admin = db.prepare("SELECT id FROM usuarios WHERE email = ?").get("admin@estoque.local");
const resumo = seedMockupData(db, data, admin?.id || null);

console.log(`Dados simulados carregados. Fornecedores=${resumo.fornecedores}, Produtos=${resumo.produtos}, Associacoes novas=${resumo.associacoesCriadas}`);
db.close();
