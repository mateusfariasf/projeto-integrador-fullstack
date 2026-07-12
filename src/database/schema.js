const { hashPassword } = require("../utils/security");

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

function seedDefaultUser(db) {
  const total = db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total;
  if (total > 0) return;
  db.prepare("INSERT INTO usuarios (nome, email, senha_hash, provedor) VALUES (?, ?, ?, 'local')")
    .run("Administrador", "admin@estoque.local", hashPassword("123456"));
}

module.exports = {
  migrate
};
