function countUsuarios(db) {
  return db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total;
}

function findUsuarioByEmail(db, email) {
  return db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);
}

function findUsuarioBySessionToken(db, tokenHash, nowIso) {
  return db.prepare(`
    SELECT u.* FROM sessoes s
    INNER JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ? AND s.expira_em > ?
  `).get(tokenHash, nowIso);
}

function createLocalUsuario(db, { nome, email, senhaHash }) {
  const result = db.prepare("INSERT INTO usuarios (nome, email, senha_hash, provedor) VALUES (?, ?, ?, 'local')")
    .run(nome, email, senhaHash);
  return db.prepare("SELECT * FROM usuarios WHERE id = ?").get(result.lastInsertRowid);
}

function createGoogleDemoUsuario(db, { email, senhaHash }) {
  const result = db.prepare("INSERT INTO usuarios (nome, email, senha_hash, provedor) VALUES (?, ?, ?, 'google-demo')")
    .run("Usuario Google Demo", email, senhaHash);
  return db.prepare("SELECT * FROM usuarios WHERE id = ?").get(result.lastInsertRowid);
}

function createSessao(db, { tokenHash, usuarioId, expiraEm }) {
  db.prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)")
    .run(tokenHash, usuarioId, expiraEm);
}

function deleteSessao(db, tokenHash) {
  db.prepare("DELETE FROM sessoes WHERE token_hash = ?").run(tokenHash);
}

module.exports = {
  countUsuarios,
  findUsuarioByEmail,
  findUsuarioBySessionToken,
  createLocalUsuario,
  createGoogleDemoUsuario,
  createSessao,
  deleteSessao
};
