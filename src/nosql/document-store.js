const fs = require("fs");
const path = require("path");

class DocumentStore {
  constructor(baseDir = path.join(__dirname, "..", "..", "data", "nosql")) {
    this.baseDir = baseDir;
  }

  insert(collection, document) {
    fs.mkdirSync(this.baseDir, { recursive: true });
    const now = new Date().toISOString();
    const record = {
      _id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: now,
      ...document
    };
    fs.appendFileSync(this.collectionPath(collection), `${JSON.stringify(record)}\n`, "utf8");
    return record;
  }

  list(collection) {
    const filePath = this.collectionPath(collection);
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  collectionPath(collection) {
    const safeName = String(collection).replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
    return path.join(this.baseDir, `${safeName}.jsonl`);
  }
}

module.exports = {
  DocumentStore
};
