// lista de treinos vindos do backend
let treinos = [];

// carregar treinos do banco
async function carregarTreinos() {
  const resposta = await fetch("/api/treinos");
  treinos = await resposta.json();

  // Busca progressão para cada treino
  for (let treino of treinos) {
    try {
      const resProgressao = await fetch(`/api/treinos/${treino.id}/progressao`);
      const progressao = await resProgressao.json();
      treino.progressao = progressao.progresso_percentual;
    } catch (erro) {
      treino.progressao = null;
    }
  }

  renderizarTreinos();
}

function renderizarTreinos() {
  const container = document.getElementById("treinos");
  container.innerHTML = "";

  treinos.forEach((treino) => {
    // Formata a progressão
    let progressaoHtml = '';
    if (treino.progressao !== null && treino.progressao !== undefined) {
      const sinal = treino.progressao >= 0 ? '+' : '';
      const progressoAbs = Math.abs(treino.progressao);

      // Calcula quantas anilhas desenhar (cada 10% = 1 anilha)
      const numAnilhas = Math.min(Math.floor(progressoAbs / 10), 10);
      const anilha = '██';
      const barraVazia = '░░';

      // Desenha a barra com anilhas
      let barraEsquerda = '';
      let barraDireita = '';

      for (let i = 0; i < 10; i++) {
        if (i < numAnilhas) {
          barraEsquerda += anilha;
          barraDireita += anilha;
        } else {
          barraEsquerda += barraVazia;
          barraDireita += barraVazia;
        }
      }

      console.log('Progressão:', treino.progressao, 'Anilhas:', numAnilhas);

      const corClasse = treino.progressao >= 0 ? 'positive' : 'negative';

      progressaoHtml = `
        <div class="barbell-container mb-3">
          <div class="barbell-display ${corClasse}">
            <span class="plates-left">${barraEsquerda}</span>
            <span class="bar">═══════</span>
            <span class="plates-right">${barraDireita}</span>
          </div>
          <div class="progress-label terminal-command">Progressive_overload ${sinal}${treino.progressao}%</div>
        </div>
      `;
    } else if (treino.total_execucoes === 0) {
      progressaoHtml = `<p class="mb-3" style="font-size: 0.85rem; color: var(--terminal-green-dark);">Ainda não executado</p>`;
    }

    const card = `
      <div class="col-md-4">
        <div class="card p-3 text-center shadow">
          <h5 class="mb-3">${treino.nome}</h5>
          ${progressaoHtml}
          <button class="btn btn-primary btn-sm terminal-command" onclick="abrirTreino(${treino.id})">
            treinar
          </button>
        </div>
      </div>
    `;
    container.innerHTML += card;
  });
}

function abrirTreino(treinoId) {
  // salva apenas o ID
  localStorage.setItem("treinoSelecionado", treinoId);
  window.location.href = "treino.html";
}

// executa ao abrir a página
carregarTreinos();
