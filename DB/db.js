import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// resolver caminho absoluto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// database sempre na raiz do projeto
const dbPath = path.join(__dirname, "../DB/database.db");

const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS treinos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercicios_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  volume_base REAL NOT NULL,
  data_base TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercicio_progresso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercicio_id INTEGER NOT NULL UNIQUE,

  volume_baseline REAL NOT NULL,
  data_baseline TEXT NOT NULL,

  volume_ultimo REAL NOT NULL,
  progresso_percentual REAL NOT NULL,
  data_ultimo_treino TEXT NOT NULL,

  FOREIGN KEY (exercicio_id) REFERENCES exercicios_base(id)
);

CREATE TABLE IF NOT EXISTS progressive_logic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercicio_nome TEXT NOT NULL UNIQUE,
  volume_baseline REAL NOT NULL,
  data_baseline TEXT NOT NULL,
  volume_ultimo REAL NOT NULL,
  progresso_percentual REAL NOT NULL,
  data_ultimo_treino TEXT NOT NULL
);
`);

export default db;