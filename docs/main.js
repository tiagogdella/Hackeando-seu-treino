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
      console.log(`Treino ${treino.nome}: progressão =`, treino.progressao);
    } catch (erro) {
      console.error(`Erro ao buscar progressão do treino ${treino.nome}:`, erro);
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
    if (treino.total_execucoes === 0) {
      progressaoHtml = `<p class="mb-3" style="font-size: 0.85rem; color: var(--terminal-green-dark);">Ainda não executado</p>`;
    } else if (treino.total_execucoes === 1) {
      progressaoHtml = `<p class="mb-3" style="font-size: 0.85rem; color: var(--terminal-green-dark);">Executado 1x</p>`;
    } else if (treino.progressao !== null && treino.progressao !== undefined) {
      const progressaoNum = parseFloat(treino.progressao);
      const sinal = progressaoNum >= 0 ? '+' : '';
      progressaoHtml = `<p class="mb-2 terminal-command" style="font-size: 0.85rem;">Progressive_overload ${sinal}${treino.progressao}%</p>`;
    }

    const card = `
      <div class="col-md-4">
        <div class="card p-3 text-center shadow">
          <h5 class="mb-3">${treino.nome}</h5>
          ${progressaoHtml}
          <div class="d-flex gap-2 justify-content-center">
            <button class="btn btn-primary btn-sm terminal-command flex-grow-1" onclick="abrirTreino(${treino.id})">
              treinar
            </button>
            <button class="btn btn-danger btn-sm terminal-command" onclick="excluirTreino(${treino.id}, '${treino.nome.replace(/'/g, "\\'")}')">
              X
            </button>
          </div>
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

async function excluirTreino(treinoId, treinoNome) {
  if (!confirm(`Tem certeza que deseja excluir o treino "${treinoNome}"?\n\nIsso vai apagar TODAS as execuções deste treino permanentemente!`)) {
    return;
  }

  try {
    const resposta = await fetch(`/api/treinos/${treinoId}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      window.Terminal.showError(dados.erro || 'Erro ao excluir treino');
      return;
    }

    window.Terminal.showSuccess(`Treino "${treinoNome}" excluído com sucesso!`);

    // Recarrega a lista de treinos
    carregarTreinos();
  } catch (erro) {
    window.Terminal.showError('Erro ao excluir treino: ' + erro.message);
  }
}

// executa ao abrir a página
carregarTreinos();
