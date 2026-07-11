const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createApp, openDatabase } = require("../src/server");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "estoque-test-"));
const db = openDatabase(path.join(tmpDir, "test.sqlite"));
const server = createApp({ db });

function listen() {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  return { status: response.status, data };
}

(async () => {
  const port = await listen();
  const baseUrl = `http://127.0.0.1:${port}`;
  let token = "";

  const fornecedorPayload = {
    nomeEmpresa: "Distribuidora Alfa",
    cnpj: "12.345.678/0001-90",
    endereco: "Rua Central, 100",
    telefone: "(61) 3333-4444",
    email: "contato@alfa.com",
    contatoPrincipal: "Ana Souza"
  };

  const produtoPayload = {
    nome: "Teclado USB",
    codigoBarras: "7891234567890",
    descricao: "Teclado com conexao USB",
    preco: 89.9,
    quantidade: 25,
    categoria: "Eletronicos",
    dataValidade: "",
    imagem: ""
  };

  const bloqueado = await request(baseUrl, "/api/fornecedores");
  assert.equal(bloqueado.status, 401);

  const login = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@estoque.local", senha: "123456" })
  });
  assert.equal(login.status, 200);
  assert.ok(login.data.token);
  token = login.data.token;

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fornecedor = await request(baseUrl, "/api/fornecedores", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(fornecedorPayload)
  });
  assert.equal(fornecedor.status, 201);
  assert.equal(fornecedor.data.mensagem, "Fornecedor cadastrado com sucesso!");

  const fornecedorDuplicado = await request(baseUrl, "/api/fornecedores", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(fornecedorPayload)
  });
  assert.equal(fornecedorDuplicado.status, 409);

  const produto = await request(baseUrl, "/api/produtos", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(produtoPayload)
  });
  assert.equal(produto.status, 201);
  assert.equal(produto.data.mensagem, "Produto cadastrado com sucesso!");

  const associacao = await request(baseUrl, "/api/produtos/1/fornecedores/1", { method: "POST", headers: authHeaders });
  assert.equal(associacao.status, 201);
  assert.equal(associacao.data.mensagem, "Fornecedor associado com sucesso ao produto!");

  const associacoes = await request(baseUrl, "/api/associacoes", { headers: authHeaders });
  assert.equal(associacoes.status, 200);
  assert.equal(associacoes.data.length, 1);
  assert.equal(associacoes.data[0].produtoNome, "Teclado USB");

  const importacao = await request(baseUrl, "/api/importacoes/nota", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      numeroNota: "123",
      fornecedor: {
        nomeEmpresa: "Fornecedor NF-e",
        cnpj: "98.765.432/0001-10",
        endereco: "Avenida Fiscal, 200",
        telefone: "(61) 4444-5555",
        email: "sem-email@fornecedor.local",
        contatoPrincipal: "Fornecedor NF-e"
      },
      produtos: [
        {
          nome: "Mouse Optico",
          codigoBarras: "7890000000001",
          descricao: "Mouse importado da nota fiscal",
          preco: 35.5,
          quantidade: 10,
          categoria: "NCM 84716053"
        },
        {
          nome: "Cabo HDMI",
          codigoBarras: "7890000000002",
          descricao: "Cabo importado da nota fiscal",
          preco: 22.9,
          quantidade: 5,
          categoria: "NCM 85444200"
        }
      ]
    })
  });
  assert.equal(importacao.status, 201);
  assert.equal(importacao.data.resumo.produtosCriados, 2);
  assert.equal(importacao.data.resumo.associacoesCriadas, 2);

  const atividades = await request(baseUrl, "/api/atividades", { headers: authHeaders });
  assert.equal(atividades.status, 200);
  assert.ok(atividades.data.some((item) => item.entidade === "nota_fiscal"));

  const mockups = await request(baseUrl, "/api/mockups/seed", {
    method: "POST",
    headers: authHeaders
  });
  assert.equal(mockups.status, 201);
  assert.equal(mockups.data.resumo.produtos, 5);
  assert.equal(mockups.data.resumo.fornecedores, 3);

  console.log("Smoke test concluido com sucesso.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    server.close();
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
