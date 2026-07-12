const {
  createGoogleDemoUsuario,
  createLocalUsuario,
  createSessao,
  deleteSessao,
  findUsuarioByEmail,
  findUsuarioBySessionToken
} = require("../repositories/usuario.repository");
const { mapUsuario } = require("../dtos/usuario.dto");
const { createRandomPassword, createToken, hashPassword, hashToken, verifyPassword } = require("../utils/security");

function login(db, body) {
  const email = String(body.email || "").trim().toLowerCase();
  const senha = String(body.senha || "");
  const row = findUsuarioByEmail(db, email);

  if (!row || !verifyPassword(senha, row.senha_hash)) {
    return { status: 401, payload: { mensagem: "E-mail ou senha invalidos." } };
  }

  return { status: 200, payload: createSessionResponse(db, row) };
}

function register(db, body) {
  const nome = String(body.nome || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const senha = String(body.senha || "");
  const errors = {};

  if (!nome) errors.nome = "Informe o nome.";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail valido.";
  if (senha.length < 6) errors.senha = "Use uma senha com pelo menos 6 caracteres.";
  if (Object.keys(errors).length) return { status: 400, payload: { mensagem: "Existem campos invalidos.", errors } };

  const exists = findUsuarioByEmail(db, email);
  if (exists) return { status: 409, payload: { mensagem: "Ja existe usuario com este e-mail." } };

  const row = createLocalUsuario(db, { nome, email, senhaHash: hashPassword(senha) });
  return { status: 201, payload: createSessionResponse(db, row) };
}

function googleDemoLogin(db) {
  const email = "usuario.google.demo@estoque.local";
  let row = findUsuarioByEmail(db, email);
  if (!row) {
    row = createGoogleDemoUsuario(db, { email, senhaHash: hashPassword(createRandomPassword()) });
  }
  return { status: 200, payload: createSessionResponse(db, row) };
}

function logout(db, req) {
  const token = getBearerToken(req);
  if (token) deleteSessao(db, hashToken(token));
  return { status: 200, payload: { mensagem: "Logout realizado com sucesso." } };
}

function createSessionResponse(db, row) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  createSessao(db, { tokenHash: hashToken(token), usuarioId: row.id, expiraEm: expiresAt });
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
  const row = findUsuarioBySessionToken(db, hashToken(token), new Date().toISOString());
  return row ? mapUsuario(row) : null;
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

module.exports = {
  login,
  register,
  googleDemoLogin,
  logout,
  getCurrentUser
};
