// lista de treinos vindos do backend
let treinos = [];

// carregar treinos do banco
async function carregarTreinos() {
  const resposta = await fetch("/api/treinos");
  treinos = await resposta.json();
  renderizarTreinos();
}

function renderizarTreinos() {
  const container = document.getElementById("treinos");
  container.innerHTML = "";

  treinos.forEach((treino) => {
    const card = `
      <div class="col-md-4">
        <div class="card p-3 text-center shadow">
          <h5>${treino.nome}</h5>
          <p><small>${treino.data}</small></p>
          <button class="btn btn-primary btn-sm" onclick="abrirTreino(${treino.id})">
            Treinar
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
