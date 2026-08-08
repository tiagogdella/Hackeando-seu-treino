import { createClient } from "@libsql/client";

if (!process.env.TURSO_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("❌ Variáveis de ambiente TURSO_URL e TURSO_AUTH_TOKEN são obrigatórias.");
  console.error("   Configure-as no painel do Render em: Environment > Add Environment Variable");
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Converte libsql Row para objeto JS simples (suporta spread, Object.keys, etc.)
 * @param {any} row
 * @param {string[]} columns
 * @returns {Record<string, any> | null}
 */
function toObj(row, columns) {
  if (!row) return null;
  const obj = {};
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    // Tenta acesso por nome primeiro (mais confiável), depois por índice
    obj[col] = col in row ? row[col] : row[i];
  }
  return obj;
}

// Wrapper com interface similar ao better-sqlite3, porém assíncrono
function prepare(sql) {
  return {
    /** @returns {Promise<Record<string, any>[]>} */
    async all(...args) {
      const { rows, columns } = await client.execute({ sql, args: args.flat() });
      return rows.map(r => toObj(r, columns));
    },
    /** @returns {Promise<Record<string, any> | null>} */
    async get(...args) {
      const { rows, columns } = await client.execute({ sql, args: args.flat() });
      return rows.length ? toObj(rows[0], columns) : null;
    },
    /** @returns {Promise<{lastInsertRowid: number, changes: number}>} */
    async run(...args) {
      const result = await client.execute({ sql, args: args.flat() });
      return {
        lastInsertRowid: Number(result.lastInsertRowid ?? 0),
        changes: result.rowsAffected,
      };
    },
  };
}

// Cria schema e executa migrations
export async function initDB() {
  const schema = [
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      nome_completo TEXT,
      data_criacao TEXT NOT NULL,
      ultimo_login TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      CHECK(length(username) >= 3)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)`,
    `CREATE TABLE IF NOT EXISTS treinos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      data_criacao TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS exercicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS treino_exercicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      treino_id INTEGER NOT NULL,
      exercicio_id INTEGER NOT NULL,
      ordem INTEGER NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'normal',
      FOREIGN KEY (treino_id) REFERENCES treinos(id) ON DELETE CASCADE,
      FOREIGN KEY (exercicio_id) REFERENCES exercicios(id),
      UNIQUE(treino_id, exercicio_id),
      CHECK(tipo IN ('normal', 'isometrico'))
    )`,
    `CREATE TABLE IF NOT EXISTS execucoes_treino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      treino_id INTEGER NOT NULL,
      data_execucao TEXT NOT NULL,
      volume_total REAL,
      FOREIGN KEY (treino_id) REFERENCES treinos(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execucao_id INTEGER NOT NULL,
      exercicio_id INTEGER NOT NULL,
      peso REAL NOT NULL,
      repeticoes INTEGER NOT NULL,
      ordem INTEGER NOT NULL,
      FOREIGN KEY (execucao_id) REFERENCES execucoes_treino(id) ON DELETE CASCADE,
      FOREIGN KEY (exercicio_id) REFERENCES exercicios(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_execucoes_treino ON execucoes_treino(treino_id, data_execucao)`,
    `CREATE INDEX IF NOT EXISTS idx_series_execucao ON series(execucao_id)`,
  ];

  for (const sql of schema) {
    await client.execute({ sql, args: [] });
  }

  // Migrations: adiciona colunas user_id às tabelas existentes (ignora se já existirem)
  const migrations = [
    'ALTER TABLE treinos ADD COLUMN user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE',
    'ALTER TABLE execucoes_treino ADD COLUMN user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE',
    'CREATE INDEX IF NOT EXISTS idx_treinos_user ON treinos(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_execucoes_user ON execucoes_treino(user_id)',
    'ALTER TABLE treinos ADD COLUMN ativo INTEGER NOT NULL DEFAULT 0',
  ];

  for (const sql of migrations) {
    try { await client.execute({ sql, args: [] }); } catch (_) {}
  }

  console.log('✓ Banco de dados Turso iniciado');
}

const db = { prepare };
export default db;
