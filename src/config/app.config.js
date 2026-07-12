const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "estoque.sqlite");
const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");
const SAMPLE_DATA_PATH = path.join(__dirname, "..", "..", "sample-data", "dados-simulatorios.json");

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

module.exports = {
  PORT,
  DB_PATH,
  PUBLIC_DIR,
  SAMPLE_DATA_PATH,
  MIME_TYPES
};
