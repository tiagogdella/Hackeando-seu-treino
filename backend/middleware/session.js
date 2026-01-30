import session from 'express-session';
import ConnectSqlite3 from 'connect-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQLiteStore = ConnectSqlite3(session);

export const sessionMiddleware = session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, '../../DB')
  }),
  secret: 'hackeando-seu-treino-secret-2026', // TODO: mover para .env em produção
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,      // Previne XSS
    secure: false,       // true em produção com HTTPS
    sameSite: 'strict',  // Previne CSRF
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
  },
  name: 'sessionId'
});
