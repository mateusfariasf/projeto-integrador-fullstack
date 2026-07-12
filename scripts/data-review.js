const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataPath = path.join(root, "sample-data", "dados-simulatorios.json");
const nfePath = path.join(root, "sample-data", "nfe-exemplo.xml");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

assert.ok(Array.isArray(data.fornecedores), "A massa deve possuir lista de fornecedores.");
assert.ok(Array.isArray(data.produtos), "A massa deve possuir lista de produtos.");
assert.ok(Array.isArray(data.associacoes), "A massa deve possuir lista de associacoes.");
assert.ok(data.fornecedores.length >= 3, "A massa deve ter pelo menos 3 fornecedores.");
assert.ok(data.produtos.length >= 5, "A massa deve ter pelo menos 5 produtos.");

const cnpjs = new Set();
for (const fornecedor of data.fornecedores) {
  assert.ok(fornecedor.nomeEmpresa, "Fornecedor deve ter nomeEmpresa.");
  assert.match(fornecedor.cnpj, /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, `CNPJ invalido: ${fornecedor.cnpj}`);
  assert.ok(!cnpjs.has(fornecedor.cnpj), `CNPJ duplicado: ${fornecedor.cnpj}`);
  assert.match(fornecedor.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, `E-mail invalido: ${fornecedor.email}`);
  cnpjs.add(fornecedor.cnpj);
}

const codigos = new Set();
for (const produto of data.produtos) {
  assert.ok(produto.nome, "Produto deve ter nome.");
  assert.match(produto.codigoBarras, /^\d+$/, `Codigo de barras invalido: ${produto.codigoBarras}`);
  assert.ok(!codigos.has(produto.codigoBarras), `Codigo de barras duplicado: ${produto.codigoBarras}`);
  assert.ok(Number(produto.preco) >= 0, `Preco negativo: ${produto.nome}`);
  assert.ok(Number(produto.quantidade) >= 0, `Quantidade negativa: ${produto.nome}`);
  assert.ok(produto.categoria, `Produto sem categoria: ${produto.nome}`);
  codigos.add(produto.codigoBarras);
}

for (const [codigoBarras, cnpj] of data.associacoes) {
  assert.ok(codigos.has(codigoBarras), `Associacao referencia produto inexistente: ${codigoBarras}`);
  assert.ok(cnpjs.has(cnpj), `Associacao referencia fornecedor inexistente: ${cnpj}`);
}

const nfe = fs.readFileSync(nfePath, "utf8");
assert.match(nfe, /<emit>/, "NF-e de exemplo deve possuir emitente.");
assert.match(nfe, /<det\b/, "NF-e de exemplo deve possuir pelo menos um item.");
assert.match(nfe, /<prod>/, "NF-e de exemplo deve possuir produto.");

console.log(`Revisao de dados concluida. Fornecedores=${data.fornecedores.length}, Produtos=${data.produtos.length}, Associacoes=${data.associacoes.length}.`);
