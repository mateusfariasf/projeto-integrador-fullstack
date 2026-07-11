const fs = require("fs");
const path = require("path");
const { openDatabase } = require("../src/server");

const db = openDatabase();
const dataPath = path.join(__dirname, "..", "sample-data", "dados-simulatorios.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const admin = db.prepare("SELECT id FROM usuarios WHERE email = ?").get("admin@estoque.local");
const usuarioId = admin?.id || null;

function upsertFornecedor(item) {
  const existing = db.prepare("SELECT id FROM fornecedores WHERE cnpj = ?").get(item.cnpj);
  if (existing) return existing.id;
  const result = db.prepare(`
    INSERT INTO fornecedores (nome_empresa, cnpj, endereco, telefone, email, contato_principal)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(item.nomeEmpresa, item.cnpj, item.endereco, item.telefone, item.email, item.contatoPrincipal);
  db.prepare(`
    INSERT INTO atividades (tipo, entidade, entidade_id, titulo, detalhe, origem, usuario_id)
    VALUES ('cadastro', 'fornecedor', ?, ?, ?, 'dados simulados', ?)
  `).run(result.lastInsertRowid, item.nomeEmpresa, item.cnpj, usuarioId);
  return result.lastInsertRowid;
}

function upsertProduto(item) {
  const existing = db.prepare("SELECT id FROM produtos WHERE codigo_barras = ?").get(item.codigoBarras);
  if (existing) return existing.id;
  const result = db.prepare(`
    INSERT INTO produtos (nome, codigo_barras, descricao, preco, quantidade, categoria, data_validade, imagem)
    VALUES (?, ?, ?, ?, ?, ?, '', '')
  `).run(item.nome, item.codigoBarras, item.descricao, item.preco, item.quantidade, item.categoria);
  db.prepare(`
    INSERT INTO atividades (tipo, entidade, entidade_id, titulo, detalhe, origem, usuario_id)
    VALUES ('cadastro', 'produto', ?, ?, ?, 'dados simulados', ?)
  `).run(result.lastInsertRowid, item.nome, `${item.quantidade} unidade(s) - codigo ${item.codigoBarras}`, usuarioId);
  return result.lastInsertRowid;
}

for (const fornecedor of data.fornecedores) upsertFornecedor(fornecedor);
for (const produto of data.produtos) upsertProduto(produto);

let associacoesCriadas = 0;
for (const [codigoBarras, cnpj] of data.associacoes) {
  const produto = db.prepare("SELECT id, nome FROM produtos WHERE codigo_barras = ?").get(codigoBarras);
  const fornecedor = db.prepare("SELECT id, nome_empresa FROM fornecedores WHERE cnpj = ?").get(cnpj);
  if (!produto || !fornecedor) continue;
  const exists = db.prepare("SELECT 1 FROM produto_fornecedor WHERE produto_id = ? AND fornecedor_id = ?").get(produto.id, fornecedor.id);
  if (exists) continue;
  db.prepare("INSERT INTO produto_fornecedor (produto_id, fornecedor_id) VALUES (?, ?)").run(produto.id, fornecedor.id);
  db.prepare(`
    INSERT INTO atividades (tipo, entidade, entidade_id, titulo, detalhe, origem, usuario_id)
    VALUES ('associacao', 'produto_fornecedor', ?, ?, 'Produto associado ao fornecedor.', 'dados simulados', ?)
  `).run(produto.id, `${produto.nome} + ${fornecedor.nome_empresa}`, usuarioId);
  associacoesCriadas += 1;
}

console.log(`Dados simulados carregados. Fornecedores=${data.fornecedores.length}, Produtos=${data.produtos.length}, Associacoes novas=${associacoesCriadas}`);
db.close();
