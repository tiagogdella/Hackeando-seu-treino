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
-- Catálogo de treinos (templates: "Treino A", "Treino B", etc.)
CREATE TABLE IF NOT EXISTS treinos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  data_criacao TEXT NOT NULL
);

-- Catálogo de exercícios únicos (nomes globais: "Supino", "Agachamento", etc.)
CREATE TABLE IF NOT EXISTS exercicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

-- Quais exercícios fazem parte de cada treino (relação N:N)
CREATE TABLE IF NOT EXISTS treino_exercicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  treino_id INTEGER NOT NULL,
  exercicio_id INTEGER NOT NULL,
  ordem INTEGER NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'normal',
  FOREIGN KEY (treino_id) REFERENCES treinos(id) ON DELETE CASCADE,
  FOREIGN KEY (exercicio_id) REFERENCES exercicios(id),
  UNIQUE(treino_id, exercicio_id),
  CHECK(tipo IN ('normal', 'isometrico'))
);

-- Cada execução de um treino (histórico: Base → Último → Atual)
CREATE TABLE IF NOT EXISTS execucoes_treino (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  treino_id INTEGER NOT NULL,
  data_execucao TEXT NOT NULL,
  volume_total REAL,
  FOREIGN KEY (treino_id) REFERENCES treinos(id) ON DELETE CASCADE
);

-- Séries individuais de cada execução (dados crus: peso + reps)
CREATE TABLE IF NOT EXISTS series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execucao_id INTEGER NOT NULL,
  exercicio_id INTEGER NOT NULL,
  peso REAL NOT NULL,
  repeticoes INTEGER NOT NULL,
  ordem INTEGER NOT NULL,
  FOREIGN KEY (execucao_id) REFERENCES execucoes_treino(id) ON DELETE CASCADE,
  FOREIGN KEY (exercicio_id) REFERENCES exercicios(id)
);

-- Índices para otimizar queries comuns
CREATE INDEX IF NOT EXISTS idx_execucoes_treino ON execucoes_treino(treino_id, data_execucao);
CREATE INDEX IF NOT EXISTS idx_series_execucao ON series(execucao_id);
`);

export default db;