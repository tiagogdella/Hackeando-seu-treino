import db from '../../DB/db.js';

// Protege rotas - requer login
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      erro: 'Não autenticado',
      autenticado: false
    });
  }

  try {
    const usuario = db.prepare(
      'SELECT id, username, nome_completo FROM usuarios WHERE id = ? AND ativo = 1'
    ).get(req.session.userId);

    if (!usuario) {
      req.session.destroy();
      return res.status(401).json({
        erro: 'Usuário inválido ou desativado',
        autenticado: false
      });
    }

    req.user = usuario; // Adiciona ao request
    next();
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao verificar autenticação' });
  }
}

// Verifica auth sem bloquear (para rotas opcionais)
export function checkAuth(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const usuario = db.prepare(
        'SELECT id, username, nome_completo FROM usuarios WHERE id = ? AND ativo = 1'
      ).get(req.session.userId);
      if (usuario) req.user = usuario;
    } catch (erro) {
      // Silenciosamente ignora erros de auth opcional
    }
  }
  next();
}
