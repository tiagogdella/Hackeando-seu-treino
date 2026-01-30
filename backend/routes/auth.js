import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../../DB/db.js';
import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ erro: 'Username e senha são obrigatórios' });
  }

  try {
    const usuario = db.prepare(
      'SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE AND ativo = 1'
    ).get(username);

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }

    const senhaValida = await bcrypt.compare(password, usuario.password_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }

    // Atualiza último login
    db.prepare('UPDATE usuarios SET ultimo_login = ? WHERE id = ?')
      .run(new Date().toISOString(), usuario.id);

    // Cria sessão
    req.session.userId = usuario.id;
    req.session.username = usuario.username;

    res.json({
      sucesso: true,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nome_completo: usuario.nome_completo
      }
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((erro) => {
    if (erro) {
      return res.status(500).json({ erro: 'Erro ao fazer logout' });
    }
    res.clearCookie('sessionId');
    res.json({ sucesso: true });
  });
});

// GET /api/auth/status
router.get('/status', checkAuth, (req, res) => {
  if (req.user) {
    res.json({
      autenticado: true,
      usuario: {
        id: req.user.id,
        username: req.user.username,
        nome_completo: req.user.nome_completo
      }
    });
  } else {
    res.json({ autenticado: false });
  }
});

export default router;
