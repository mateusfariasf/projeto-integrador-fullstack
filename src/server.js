const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "estoque.sqlite");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function openDatabase(dbPath = DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      provedor TEXT NOT NULL DEFAULT 'local',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessoes (
      token_hash TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      expira_em TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_empresa TEXT NOT NULL,
      cnpj TEXT NOT NULL UNIQUE,
      endereco TEXT NOT NULL,
      telefone TEXT NOT NULL,
      email TEXT NOT NULL,
      contato_principal TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo_barras TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      preco REAL NOT NULL DEFAULT 0,
      quantidade INTEGER NOT NULL DEFAULT 0,
      categoria TEXT NOT NULL,
      data_validade TEXT,
      imagem TEXT,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produto_fornecedor (
      produto_id INTEGER NOT NULL,
      fornecedor_id INTEGER NOT NULL,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (produto_id, fornecedor_id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS atividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      entidade TEXT NOT NULL,
      entidade_id INTEGER,
      titulo TEXT NOT NULL,
      detalhe TEXT,
      origem TEXT NOT NULL DEFAULT 'manual',
      usuario_id INTEGER,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
  `);
  seedDefaultUser(db);
}

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

  serveStatic(res, publicDir, url.pathname);
}

async function routeApi(req, res, db, url) {
  const method = req.method;
  const parts = url.pathname.split("/").filter(Boolean);

  if (method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (parts[1] === "auth") {
    await handleAuth(req, res, db, method, parts);
    return;
  }

  const usuario = getCurrentUser(req, db);
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
    sendJson(res, 200, listAssociacoes(db));
    return;
  }

  if (method === "GET" && url.pathname === "/api/atividades") {
    sendJson(res, 200, listAtividades(db));
    return;
  }

  if (method === "POST" && url.pathname === "/api/importacoes/nota") {
    await handleImportacaoNota(req, res, db, usuario);
    return;
  }

  sendJson(res, 404, { mensagem: "Rota nao encontrada." });
}

async function handleAuth(req, res, db, method, parts) {
  if (method === "GET" && parts[2] === "me") {
    const usuario = getCurrentUser(req, db);
    usuario ? sendJson(res, 200, { usuario }) : sendJson(res, 401, { mensagem: "Sessao invalida ou expirada." });
    return;
  }

  if (method === "POST" && parts[2] === "login") {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const row = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);

    if (!row || !verifyPassword(senha, row.senha_hash)) {
      sendJson(res, 401, { mensagem: "E-mail ou senha invalidos." });
      return;
    }

    sendJson(res, 200, createSessionResponse(db, row));
    return;
  }

  if (method === "POST" && parts[2] === "register") {
    const body = await readJson(req);
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const errors = {};

    if (!nome) errors.nome = "Informe o nome.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail valido.";
    if (senha.length < 6) errors.senha = "Use uma senha com pelo menos 6 caracteres.";
    if (Object.keys(errors).length) return sendJson(res, 400, { mensagem: "Existem campos invalidos.", errors });

    const exists = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email);
    if (exists) return sendJson(res, 409, { mensagem: "Ja existe usuario com este e-mail." });

    const result = db.prepare("INSERT INTO usuarios (nome, email, senha_hash, provedor) VALUES (?, ?, ?, 'local')")
      .run(nome, email, hashPassword(senha));
    const row = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(result.lastInsertRowid);
    sendJson(res, 201, createSessionResponse(db, row));
    return;
  }

  if (method === "POST" && parts[2] === "google-demo") {
    const email = "usuario.google.demo@estoque.local";
    let row = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);
    if (!row) {
      const result = db.prepare("INSERT INTO usuarios (nome, email, senha_hash, provedor) VALUES (?, ?, ?, 'google-demo')")
        .run("Usuario Google Demo", email, hashPassword(crypto.randomBytes(16).toString("hex")));
      row = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(result.lastInsertRowid);
    }
    sendJson(res, 200, createSessionResponse(db, row));
    return;
  }

  if (method === "POST" && parts[2] === "logout") {
    const token = getBearerToken(req);
    if (token) db.prepare("DELETE FROM sessoes WHERE token_hash = ?").run(hashToken(token));
    sendJson(res, 200, { mensagem: "Logout realizado com sucesso." });
    return;
  }

  sendJson(res, 404, { mensagem: "Rota de autenticacao nao encontrada." });
}

async function handleFornecedores(req, res, db, method, parts, usuario) {
  const id = Number(parts[2]);

  if (method === "GET" && parts.length === 2) {
    sendJson(res, 200, db.prepare("SELECT * FROM fornecedores ORDER BY nome_empresa").all().map(mapFornecedor));
    return;
  }

  if (method === "GET" && parts.length === 3) {
    const row = db.prepare("SELECT * FROM fornecedores WHERE id = ?").get(id);
    row ? sendJson(res, 200, mapFornecedor(row)) : sendJson(res, 404, { mensagem: "Fornecedor nao encontrado." });
    return;
  }

  if (method === "GET" && parts.length === 4 && parts[3] === "produtos") {
    sendJson(res, 200, produtosPorFornecedor(db, id));
    return;
  }

  if (method === "POST" && parts.length === 2) {
    const body = await readJson(req);
    const validation = validateFornecedor(body);
    if (!validation.ok) return sendJson(res, 400, validation);

    const duplicate = db.prepare("SELECT id FROM fornecedores WHERE cnpj = ?").get(body.cnpj.trim());
    if (duplicate) return sendJson(res, 409, { mensagem: "Fornecedor com esse CNPJ ja esta cadastrado!" });

    const result = db.prepare(`
      INSERT INTO fornecedores (nome_empresa, cnpj, endereco, telefone, email, contato_principal)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      body.nomeEmpresa.trim(),
      body.cnpj.trim(),
      body.endereco.trim(),
      body.telefone.trim(),
      body.email.trim(),
      body.contatoPrincipal.trim()
    );

    const fornecedor = getFornecedor(db, result.lastInsertRowid);
    registrarAtividade(db, {
      tipo: "cadastro",
      entidade: "fornecedor",
      entidadeId: fornecedor.id,
      titulo: fornecedor.nomeEmpresa,
      detalhe: fornecedor.cnpj,
      origem: "manual",
      usuarioId: usuario.id
    });
    sendJson(res, 201, { mensagem: "Fornecedor cadastrado com sucesso!", fornecedor });
    return;
  }

  if (method === "PUT" && parts.length === 3) {
    const body = await readJson(req);
    const validation = validateFornecedor(body);
    if (!validation.ok) return sendJson(res, 400, validation);

    const existing = getFornecedor(db, id);
    if (!existing) return sendJson(res, 404, { mensagem: "Fornecedor nao encontrado." });

    const duplicate = db.prepare("SELECT id FROM fornecedores WHERE cnpj = ? AND id <> ?").get(body.cnpj.trim(), id);
    if (duplicate) return sendJson(res, 409, { mensagem: "Fornecedor com esse CNPJ ja esta cadastrado!" });

    db.prepare(`
      UPDATE fornecedores
      SET nome_empresa = ?, cnpj = ?, endereco = ?, telefone = ?, email = ?, contato_principal = ?
      WHERE id = ?
    `).run(
      body.nomeEmpresa.trim(),
      body.cnpj.trim(),
      body.endereco.trim(),
      body.telefone.trim(),
      body.email.trim(),
      body.contatoPrincipal.trim(),
      id
    );

    const fornecedor = getFornecedor(db, id);
    registrarAtividade(db, {
      tipo: "atualizacao",
      entidade: "fornecedor",
      entidadeId: id,
      titulo: fornecedor.nomeEmpresa,
      detalhe: fornecedor.cnpj,
      origem: "manual",
      usuarioId: usuario.id
    });
    sendJson(res, 200, { mensagem: "Fornecedor atualizado com sucesso!", fornecedor });
    return;
  }

  if (method === "DELETE" && parts.length === 3) {
    const result = db.prepare("DELETE FROM fornecedores WHERE id = ?").run(id);
    result.changes
      ? sendJson(res, 200, { mensagem: "Fornecedor removido com sucesso!" })
      : sendJson(res, 404, { mensagem: "Fornecedor nao encontrado." });
    return;
  }

  sendJson(res, 404, { mensagem: "Rota de fornecedor nao encontrada." });
}

async function handleProdutos(req, res, db, method, parts, usuario) {
  const id = Number(parts[2]);

  if (method === "GET" && parts.length === 2) {
    sendJson(res, 200, db.prepare("SELECT * FROM produtos ORDER BY nome").all().map(mapProduto));
    return;
  }

  if (method === "GET" && parts.length === 3) {
    const row = db.prepare("SELECT * FROM produtos WHERE id = ?").get(id);
    row ? sendJson(res, 200, mapProduto(row)) : sendJson(res, 404, { mensagem: "Produto nao encontrado." });
    return;
  }

  if (method === "GET" && parts.length === 4 && parts[3] === "fornecedores") {
    sendJson(res, 200, fornecedoresPorProduto(db, id));
    return;
  }

  if (method === "POST" && parts.length === 2) {
    const body = await readJson(req);
    const validation = validateProduto(body);
    if (!validation.ok) return sendJson(res, 400, validation);

    const duplicate = db.prepare("SELECT id FROM produtos WHERE codigo_barras = ?").get(body.codigoBarras.trim());
    if (duplicate) return sendJson(res, 409, { mensagem: "Produto com este codigo de barras ja esta cadastrado!" });

    const result = db.prepare(`
      INSERT INTO produtos (nome, codigo_barras, descricao, preco, quantidade, categoria, data_validade, imagem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.nome.trim(),
      body.codigoBarras.trim(),
      body.descricao.trim(),
      Number(body.preco || 0),
      Number(body.quantidade || 0),
      body.categoria.trim(),
      body.dataValidade || "",
      body.imagem || ""
    );

    const produto = getProduto(db, result.lastInsertRowid);
    registrarAtividade(db, {
      tipo: "cadastro",
      entidade: "produto",
      entidadeId: produto.id,
      titulo: produto.nome,
      detalhe: `${produto.quantidade} unidade(s) - codigo ${produto.codigoBarras}`,
      origem: "manual",
      usuarioId: usuario.id
    });
    sendJson(res, 201, { mensagem: "Produto cadastrado com sucesso!", produto });
    return;
  }

  if (method === "PUT" && parts.length === 3) {
    const body = await readJson(req);
    const validation = validateProduto(body);
    if (!validation.ok) return sendJson(res, 400, validation);

    const existing = getProduto(db, id);
    if (!existing) return sendJson(res, 404, { mensagem: "Produto nao encontrado." });

    const duplicate = db.prepare("SELECT id FROM produtos WHERE codigo_barras = ? AND id <> ?").get(body.codigoBarras.trim(), id);
    if (duplicate) return sendJson(res, 409, { mensagem: "Produto com este codigo de barras ja esta cadastrado!" });

    db.prepare(`
      UPDATE produtos
      SET nome = ?, codigo_barras = ?, descricao = ?, preco = ?, quantidade = ?, categoria = ?, data_validade = ?, imagem = ?
      WHERE id = ?
    `).run(
      body.nome.trim(),
      body.codigoBarras.trim(),
      body.descricao.trim(),
      Number(body.preco || 0),
      Number(body.quantidade || 0),
      body.categoria.trim(),
      body.dataValidade || "",
      body.imagem || "",
      id
    );

    const produto = getProduto(db, id);
    registrarAtividade(db, {
      tipo: "atualizacao",
      entidade: "produto",
      entidadeId: id,
      titulo: produto.nome,
      detalhe: `${produto.quantidade} unidade(s) - codigo ${produto.codigoBarras}`,
      origem: "manual",
      usuarioId: usuario.id
    });
    sendJson(res, 200, { mensagem: "Produto atualizado com sucesso!", produto });
    return;
  }

  if (method === "DELETE" && parts.length === 3) {
    const result = db.prepare("DELETE FROM produtos WHERE id = ?").run(id);
    result.changes
      ? sendJson(res, 200, { mensagem: "Produto removido com sucesso!" })
      : sendJson(res, 404, { mensagem: "Produto nao encontrado." });
    return;
  }

  if (parts.length === 5 && parts[3] === "fornecedores") {
    const produtoId = Number(parts[2]);
    const fornecedorId = Number(parts[4]);

    if (method === "POST") {
      const produto = getProduto(db, produtoId);
      const fornecedor = getFornecedor(db, fornecedorId);
      if (!produto || !fornecedor) return sendJson(res, 404, { mensagem: "Produto ou fornecedor nao encontrado." });

      const existing = db.prepare(`
        SELECT produto_id FROM produto_fornecedor WHERE produto_id = ? AND fornecedor_id = ?
      `).get(produtoId, fornecedorId);
      if (existing) return sendJson(res, 409, { mensagem: "Fornecedor ja esta associado a este produto!" });

      db.prepare("INSERT INTO produto_fornecedor (produto_id, fornecedor_id) VALUES (?, ?)").run(produtoId, fornecedorId);
      registrarAtividade(db, {
        tipo: "associacao",
        entidade: "produto_fornecedor",
        entidadeId: produtoId,
        titulo: `${produto.nome} + ${fornecedor.nomeEmpresa}`,
        detalhe: "Fornecedor associado ao produto.",
        origem: "manual",
        usuarioId: usuario.id
      });
      sendJson(res, 201, { mensagem: "Fornecedor associado com sucesso ao produto!" });
      return;
    }

    if (method === "DELETE") {
      const result = db.prepare(`
        DELETE FROM produto_fornecedor WHERE produto_id = ? AND fornecedor_id = ?
      `).run(produtoId, fornecedorId);
      result.changes
        ? sendJson(res, 200, { mensagem: "Fornecedor desassociado com sucesso!" })
        : sendJson(res, 404, { mensagem: "Associacao nao encontrada." });
      return;
    }
  }

  sendJson(res, 404, { mensagem: "Rota de produto nao encontrada." });
}

async function handleImportacaoNota(req, res, db, usuario) {
  const body = await readJson(req);
  const produtos = Array.isArray(body.produtos) ? body.produtos : [];
  const fornecedorPayload = body.fornecedor || null;
  const numeroNota = String(body.numeroNota || "").trim();
  const origem = numeroNota ? `nota fiscal ${numeroNota}` : "nota fiscal";

  if (!produtos.length) {
    sendJson(res, 400, { mensagem: "Nenhum produto encontrado para importar." });
    return;
  }

  let fornecedor = null;
  if (fornecedorPayload?.cnpj && fornecedorPayload?.nomeEmpresa) {
    fornecedor = upsertFornecedorImportado(db, fornecedorPayload, usuario.id, origem);
  }

  const resumo = {
    produtosCriados: 0,
    produtosAtualizados: 0,
    fornecedoresCriados: fornecedor?.criado ? 1 : 0,
    associacoesCriadas: 0,
    ignorados: []
  };

  for (let index = 0; index < produtos.length; index += 1) {
    const normalizado = normalizeProdutoImportado(produtos[index], index);
    const validation = validateProduto(normalizado);
    if (!validation.ok) {
      resumo.ignorados.push({ linha: index + 1, nome: produtos[index]?.nome || "", erros: validation.errors });
      continue;
    }

    const existente = db.prepare("SELECT * FROM produtos WHERE codigo_barras = ?").get(normalizado.codigoBarras);
    let produtoId;
    if (existente) {
      const novaQuantidade = Number(existente.quantidade || 0) + Number(normalizado.quantidade || 0);
      db.prepare(`
        UPDATE produtos
        SET nome = ?, descricao = ?, preco = ?, quantidade = ?, categoria = ?, data_validade = COALESCE(NULLIF(?, ''), data_validade)
        WHERE id = ?
      `).run(
        normalizado.nome,
        normalizado.descricao,
        Number(normalizado.preco || 0),
        novaQuantidade,
        normalizado.categoria,
        normalizado.dataValidade || "",
        existente.id
      );
      produtoId = existente.id;
      resumo.produtosAtualizados += 1;
    } else {
      const result = db.prepare(`
        INSERT INTO produtos (nome, codigo_barras, descricao, preco, quantidade, categoria, data_validade, imagem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        normalizado.nome,
        normalizado.codigoBarras,
        normalizado.descricao,
        Number(normalizado.preco || 0),
        Number(normalizado.quantidade || 0),
        normalizado.categoria,
        normalizado.dataValidade || "",
        ""
      );
      produtoId = result.lastInsertRowid;
      resumo.produtosCriados += 1;
    }

    const produto = getProduto(db, produtoId);
    registrarAtividade(db, {
      tipo: existente ? "atualizacao" : "cadastro",
      entidade: "produto",
      entidadeId: produto.id,
      titulo: produto.nome,
      detalhe: `${produto.quantidade} unidade(s) - ${origem}`,
      origem,
      usuarioId: usuario.id
    });

    if (fornecedor?.id) {
      const assoc = db.prepare("SELECT 1 FROM produto_fornecedor WHERE produto_id = ? AND fornecedor_id = ?").get(produto.id, fornecedor.id);
      if (!assoc) {
        db.prepare("INSERT INTO produto_fornecedor (produto_id, fornecedor_id) VALUES (?, ?)").run(produto.id, fornecedor.id);
        resumo.associacoesCriadas += 1;
      }
    }
  }

  registrarAtividade(db, {
    tipo: "importacao",
    entidade: "nota_fiscal",
    entidadeId: null,
    titulo: numeroNota ? `Nota fiscal ${numeroNota}` : "Importacao de nota fiscal",
    detalhe: `${resumo.produtosCriados} criado(s), ${resumo.produtosAtualizados} atualizado(s), ${resumo.ignorados.length} ignorado(s).`,
    origem,
    usuarioId: usuario.id
  });

  sendJson(res, 201, { mensagem: "Nota fiscal importada com sucesso.", resumo });
}

function validateFornecedor(data) {
  const errors = {};
  if (!data.nomeEmpresa?.trim()) errors.nomeEmpresa = "Informe o nome da empresa.";
  if (!data.cnpj?.trim()) errors.cnpj = "Informe o CNPJ.";
  if (data.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(data.cnpj.trim())) {
    errors.cnpj = "Use o formato 00.000.000/0000-00.";
  }
  if (!data.endereco?.trim()) errors.endereco = "Informe o endereco.";
  if (!data.telefone?.trim()) errors.telefone = "Informe o telefone.";
  if (!data.email?.trim()) errors.email = "Informe o e-mail.";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Informe um e-mail valido.";
  }
  if (!data.contatoPrincipal?.trim()) errors.contatoPrincipal = "Informe o contato principal.";
  return Object.keys(errors).length ? { ok: false, mensagem: "Existem campos invalidos.", errors } : { ok: true };
}

function validateProduto(data) {
  const errors = {};
  if (!data.nome?.trim()) errors.nome = "Informe o nome do produto.";
  if (!data.codigoBarras?.trim()) errors.codigoBarras = "Informe o codigo de barras.";
  if (data.codigoBarras && !/^\d+$/.test(data.codigoBarras.trim())) {
    errors.codigoBarras = "Use apenas numeros no codigo de barras.";
  }
  if (!data.descricao?.trim()) errors.descricao = "Informe a descricao.";
  if (data.preco !== undefined && data.preco !== "" && Number(data.preco) < 0) errors.preco = "O preco nao pode ser negativo.";
  if (data.quantidade !== undefined && data.quantidade !== "" && Number(data.quantidade) < 0) {
    errors.quantidade = "A quantidade nao pode ser negativa.";
  }
  if (!data.categoria?.trim()) errors.categoria = "Informe a categoria.";
  return Object.keys(errors).length ? { ok: false, mensagem: "Existem campos invalidos.", errors } : { ok: true };
}

function getFornecedor(db, id) {
  const row = db.prepare("SELECT * FROM fornecedores WHERE id = ?").get(id);
  return row ? mapFornecedor(row) : null;
}

function getProduto(db, id) {
  const row = db.prepare("SELECT * FROM produtos WHERE id = ?").get(id);
  return row ? mapProduto(row) : null;
}

function fornecedoresPorProduto(db, produtoId) {
  return db.prepare(`
    SELECT f.* FROM fornecedores f
    INNER JOIN produto_fornecedor pf ON pf.fornecedor_id = f.id
    WHERE pf.produto_id = ?
    ORDER BY f.nome_empresa
  `).all(produtoId).map(mapFornecedor);
}

function produtosPorFornecedor(db, fornecedorId) {
  return db.prepare(`
    SELECT p.* FROM produtos p
    INNER JOIN produto_fornecedor pf ON pf.produto_id = p.id
    WHERE pf.fornecedor_id = ?
    ORDER BY p.nome
  `).all(fornecedorId).map(mapProduto);
}

function listAssociacoes(db) {
  return db.prepare(`
    SELECT
      p.id AS produto_id,
      p.nome AS produto_nome,
      p.codigo_barras,
      f.id AS fornecedor_id,
      f.nome_empresa,
      f.cnpj
    FROM produto_fornecedor pf
    INNER JOIN produtos p ON p.id = pf.produto_id
    INNER JOIN fornecedores f ON f.id = pf.fornecedor_id
    ORDER BY p.nome, f.nome_empresa
  `).all().map((row) => ({
    produtoId: row.produto_id,
    produtoNome: row.produto_nome,
    codigoBarras: row.codigo_barras,
    fornecedorId: row.fornecedor_id,
    nomeEmpresa: row.nome_empresa,
      cnpj: row.cnpj
  }));
}

function listAtividades(db) {
  return db.prepare(`
    SELECT
      a.*,
      u.nome AS usuario_nome
    FROM atividades a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.id DESC
    LIMIT 30
  `).all().map((row) => ({
    id: row.id,
    tipo: row.tipo,
    entidade: row.entidade,
    entidadeId: row.entidade_id,
    titulo: row.titulo,
    detalhe: row.detalhe || "",
    origem: row.origem,
    usuarioNome: row.usuario_nome || "Sistema",
    criadoEm: row.criado_em
  }));
}

function upsertFornecedorImportado(db, payload, usuarioId, origem) {
  const cnpj = String(payload.cnpj || "").trim();
  const nomeEmpresa = String(payload.nomeEmpresa || "").trim();
  const existente = db.prepare("SELECT * FROM fornecedores WHERE cnpj = ?").get(cnpj);
  if (existente) return { ...mapFornecedor(existente), criado: false };

  const result = db.prepare(`
    INSERT INTO fornecedores (nome_empresa, cnpj, endereco, telefone, email, contato_principal)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    nomeEmpresa,
    cnpj,
    String(payload.endereco || "Endereco nao informado").trim(),
    String(payload.telefone || "(00) 0000-0000").trim(),
    String(payload.email || "sem-email@fornecedor.local").trim(),
    String(payload.contatoPrincipal || nomeEmpresa).trim()
  );
  const fornecedor = getFornecedor(db, result.lastInsertRowid);
  registrarAtividade(db, {
    tipo: "cadastro",
    entidade: "fornecedor",
    entidadeId: fornecedor.id,
    titulo: fornecedor.nomeEmpresa,
    detalhe: fornecedor.cnpj,
    origem,
    usuarioId
  });
  return { ...fornecedor, criado: true };
}

function normalizeProdutoImportado(item, index) {
  const codigoBase = String(item.codigoBarras || item.codigo || item.cProd || "").trim();
  const codigoNumerico = codigoBase.replace(/\D/g, "");
  const codigoBarras = codigoNumerico || String(Date.now()).slice(-10) + String(index + 1).padStart(3, "0");
  return {
    nome: String(item.nome || item.xProd || `Produto importado ${index + 1}`).trim(),
    codigoBarras,
    descricao: String(item.descricao || item.nome || item.xProd || "Produto importado de nota fiscal").trim(),
    preco: Number(item.preco ?? item.vUnCom ?? item.valorUnitario ?? 0),
    quantidade: Number(item.quantidade ?? item.qCom ?? 1),
    categoria: String(item.categoria || item.ncm || "Importado da NF-e").trim(),
    dataValidade: String(item.dataValidade || "").trim(),
    imagem: ""
  };
}

function registrarAtividade(db, { tipo, entidade, entidadeId, titulo, detalhe = "", origem = "manual", usuarioId = null }) {
  db.prepare(`
    INSERT INTO atividades (tipo, entidade, entidade_id, titulo, detalhe, origem, usuario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(tipo, entidade, entidadeId, titulo, detalhe, origem, usuarioId);
}

function mapFornecedor(row) {
  return {
    id: row.id,
    nomeEmpresa: row.nome_empresa,
    cnpj: row.cnpj,
    endereco: row.endereco,
    telefone: row.telefone,
    email: row.email,
    contatoPrincipal: row.contato_principal,
    criadoEm: row.criado_em
  };
}

function mapProduto(row) {
  return {
    id: row.id,
    nome: row.nome,
    codigoBarras: row.codigo_barras,
    descricao: row.descricao,
    preco: row.preco,
    quantidade: row.quantidade,
    categoria: row.categoria,
    dataValidade: row.data_validade || "",
    imagem: row.imagem || "",
    criadoEm: row.criado_em
  };
}

function seedDefaultUser(db) {
  const total = db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total;
  if (total > 0) return;
  db.prepare("INSERT INTO usuarios (nome, email, senha_hash, provedor) VALUES (?, ?, ?, 'local')")
    .run("Administrador", "admin@estoque.local", hashPassword("123456"));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const current = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(current, "hex"));
}

function createSessionResponse(db, row) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)")
    .run(hashToken(token), row.id, expiresAt);
  return {
    mensagem: "Login realizado com sucesso.",
    token,
    usuario: mapUsuario(row),
    expiraEm: expiresAt
  };
}

function getCurrentUser(req, db) {
  const token = getBearerToken(req);
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessoes s
    INNER JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ? AND s.expira_em > ?
  `).get(hashToken(token), new Date().toISOString());
  return row ? mapUsuario(row) : null;
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function mapUsuario(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    provedor: row.provedor
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end();
}

function serveStatic(res, publicDir, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, requestedPath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Acesso negado.");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Arquivo nao encontrado.");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

if (require.main === module) {
  const server = createApp();
  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/`);
  });
}

module.exports = { createApp, openDatabase };
