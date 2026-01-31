/**
 * Auth Module - Verificação de autenticação
 */

// Verifica se usuário está autenticado
async function verificarAutenticacao() {
  // Não verificar na página de login
  if (window.location.pathname.includes('login.html')) {
    return;
  }

  try {
    const resposta = await fetch('/api/auth/status');
    const dados = await resposta.json();

    if (!dados.autenticado) {
      // Redireciona para login
      window.location.href = 'login.html';
      return;
    }

    // Salva usuário atual globalmente
    if (dados.usuario) {
      window.currentUser = dados.usuario;
    }
  } catch (erro) {
    console.error('Erro ao verificar autenticação:', erro);
    window.location.href = 'login.html';
  }
}

// Função de logout
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.Terminal.showSuccess('Logout realizado');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  } catch (erro) {
    window.Terminal.showError('Erro ao fazer logout');
  }
}

// Executar ao carregar
verificarAutenticacao();

// Exportar
window.Auth = { verificarAutenticacao, logout };
