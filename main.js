// carregar treino
let treinos = [];

async function carregarTreinos() {
  const resposta = await fetch("/api/treinos");
  treinos = await resposta.json();
  renderizarTreinos();
}

function renderizarTreinos() {
  const container = document.getElementById("treinos");
  container.innerHTML = "";

  treinos.forEach((treino, index) => {
    const card = `
      <div class="col-md-4">
        <div class="card p-3 text-center shadow">
          <h5>${treino.nome}</h5>
          <p><small>${treino.exercicios} exercícios</small></p>
          <button class="btn btn-primary btn-sm" onclick="abrirTreino(${index})">Treinar</button>
        </div>
      </div>
    `;
    container.innerHTML += card;
  });
}

// executa ao abrir a página
carregarTreinos();


// Se não tiver nada salvo, cria um exemplo inicial
if (treinos.length === 0) {
  treinos = [
    { nome: "Peito e Tríceps", primeiro_ex: "paralela", series_pri_ex : "5", peso_pri_ex: "87kg", reps_pri_ex: [10,10,10,10,10], 
      segundo_ex: "flexão", series_seg_ex : "3", peso_seg_ex: "87kg", reps_seg_ex: [10,10,10],
      terceiro_ex: "triceps barra", series_ter_ex : "3", peso_ter_ex: "87kg", reps_ter_ex: [10,10,10], exercicios: 3 },
    { nome: "Costas e Bíceps", primeiro_ex: "barra aberta", series_pri_ex : "5", peso_pri_ex: "87kg", reps_pri_ex: [10,10,10,10,10], 
      segundo_ex: "barra supinada", series_seg_ex : "3", peso_seg_ex: "87kg", reps_seg_ex: [9,9,10],
      terceiro_ex: "puxada aberta barra", series_ter_ex : "3", peso_ter_ex: "87kg", reps_ter_ex: [10,10,10], exercicios: 3 }
  ];

  // Salva no localStorage
  localStorage.setItem("treinos", JSON.stringify(treinos));
}

const container = document.getElementById("treinos");

treinos.forEach((treino, index) => {
  const card = `
    <div class="col-md-4">
      <div class="card p-3 text-center shadow">
        <h5>${treino.nome}</h5>
        <p><small>${treino.exercicios} exercícios</small></p>
        <button class="btn btn-primary btn-sm" onclick="abrirTreino(${index})">Treinar</button>
      </div>
    </div>
  `;
  container.innerHTML += card;
});

function abrirTreino(index) {
  localStorage.setItem("treinoSelecionado", treinos[index]);
  window.location.href = "treino.html";
}