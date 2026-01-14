import Database from "better-sqlite3";

const db = new Database("database.db");

// Criar tabela caso não exista
db.exec(`
CREATE TABLE IF NOT EXISTS treinos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  exercicios INTEGER,
  primeiro_ex TEXT,
  series_pri_ex TEXT,
  peso_pri_ex TEXT,
  reps_pri_ex TEXT,
  segundo_ex TEXT,
  series_seg_ex TEXT,
  peso_seg_ex TEXT,
  reps_seg_ex TEXT,
  terceiro_ex TEXT,
  series_ter_ex TEXT,
  peso_ter_ex TEXT,
  reps_ter_ex TEXT
);
`);

export default db;
