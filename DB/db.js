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
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  nome_completo TEXT,
  data_criacao TEXT NOT NULL,
  ultimo_login TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  CHECK(length(username) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

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

// Adicionar colunas user_id às tabelas existentes (se ainda não existirem)
try {
  db.exec('ALTER TABLE treinos ADD COLUMN user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE');
  console.log('✓ Coluna user_id adicionada à tabela treinos');
} catch (e) {
  // Coluna já existe, ignorar
}

try {
  db.exec('ALTER TABLE execucoes_treino ADD COLUMN user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE');
  console.log('✓ Coluna user_id adicionada à tabela execucoes_treino');
} catch (e) {
  // Coluna já existe, ignorar
}

// Criar índices para performance
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_treinos_user ON treinos(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_execucoes_user ON execucoes_treino(user_id)');
  console.log('✓ Índices de user_id criados');
} catch (e) {
  // Índices já existem, ignorar
}

export default db;