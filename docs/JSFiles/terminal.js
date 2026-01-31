/**
 * Terminal Module - Hackeando seu Treino
 * Funções para efeitos de terminal: typewriter e logs
 */

// Container para logs (criado dinamicamente)
let logsContainer = null;

/**
 * Inicializa o container de logs no DOM
 */
function initLogsContainer() {
  if (!logsContainer) {
    logsContainer = document.createElement('div');
    logsContainer.id = 'terminal-logs';
    document.body.appendChild(logsContainer);
  }
}

/**
 * Efeito de digitação (typewriter)
 * @param {HTMLElement} element - Elemento onde aplicar o efeito
 * @param {string} text - Texto a ser digitado
 * @param {number} speed - Velocidade em ms por caractere (default: 50ms)
 * @returns {Promise} - Promise que resolve quando a animação termina
 */
function typeWriter(element, text, speed = 50) {
  return new Promise((resolve) => {
    if (!element || !text) {
      resolve();
      return;
    }

    element.textContent = '';
    let i = 0;

    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        requestAnimationFrame(() => {
          setTimeout(type, speed);
        });
      } else {
        resolve();
      }
    }

    type();
  });
}

/**
 * Exibe uma mensagem de log estilo terminal
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de log: 'success', 'error', 'info' (default: 'info')
 * @param {number} duration - Duração em ms antes de remover (default: 3000ms)
 */
function showLog(message, type = 'info', duration = 3000) {
  initLogsContainer();

  // Criar elemento de log
  const logElement = document.createElement('div');
  logElement.className = `terminal-log-message ${type}`;

  // Adicionar timestamp
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  logElement.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-text">> ${message}</span>
  `;

  // Adicionar ao container
  logsContainer.appendChild(logElement);

  // Remover após duration
  setTimeout(() => {
    logElement.style.opacity = '0';
    setTimeout(() => {
      if (logElement.parentNode) {
        logElement.parentNode.removeChild(logElement);
      }
    }, 300);
  }, duration);
}

/**
 * Aplica efeito typewriter em elementos com classe 'typewriter'
 * Útil para aplicar em múltiplos elementos de uma vez
 */
function applyTypewriterToAll() {
  const elements = document.querySelectorAll('.typewriter');
  elements.forEach((el, index) => {
    const text = el.textContent;
    // Delay para cada elemento (stagger effect)
    setTimeout(() => {
      typeWriter(el, text, 30);
    }, index * 100);
  });
}

/**
 * Substitui alert() nativo por showLog
 * Útil para migrar código existente
 * @param {string} message - Mensagem do alert
 */
function terminalAlert(message) {
  showLog(message, 'info', 4000);
}

/**
 * Exibe mensagem de sucesso
 * @param {string} message - Mensagem de sucesso
 */
function showSuccess(message) {
  showLog(message, 'success', 3000);
}

/**
 * Exibe mensagem de erro
 * @param {string} message - Mensagem de erro
 */
function showError(message) {
  showLog(message, 'error', 4000);
}

/**
 * Adiciona prefixo de comando terminal ($) a um elemento
 * @param {string} selector - Seletor CSS do elemento
 */
function addCommandPrefix(selector) {
  const element = document.querySelector(selector);
  if (element && !element.classList.contains('terminal-command')) {
    element.classList.add('terminal-command');
  }
}

/**
 * Adiciona prefixo de prompt terminal (>) a um elemento
 * @param {string} selector - Seletor CSS do elemento
 */
function addPromptPrefix(selector) {
  const element = document.querySelector(selector);
  if (element && !element.classList.contains('terminal-prompt')) {
    element.classList.add('terminal-prompt');
  }
}

/**
 * Inicializa efeitos de terminal na página
 * Deve ser chamado quando o DOM estiver pronto
 */
function initTerminalEffects() {
  // Aplicar typewriter em elementos marcados
  applyTypewriterToAll();

  // Inicializar container de logs
  initLogsContainer();

  // Log de inicialização (comentado por padrão)
  // showLog('Sistema inicializado', 'success', 2000);
}

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTerminalEffects);
} else {
  initTerminalEffects();
}

// Exportar funções para uso global (window)
window.Terminal = {
  typeWriter,
  showLog,
  showSuccess,
  showError,
  terminalAlert,
  addCommandPrefix,
  addPromptPrefix,
  applyTypewriterToAll,
  initTerminalEffects
};
