const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { DB_PATH } = require("../config/app.config");
const { migrate } = require("./schema");

function openDatabase(dbPath = DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

module.exports = {
  openDatabase
};
