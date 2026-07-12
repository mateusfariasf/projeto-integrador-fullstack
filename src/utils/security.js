const crypto = require("crypto");

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

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createRandomPassword() {
  return crypto.randomBytes(16).toString("hex");
}

module.exports = {
  hashPassword,
  verifyPassword,
  hashToken,
  createToken,
  createRandomPassword
};
