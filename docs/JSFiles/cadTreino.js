const container = document.getElementById("containerAddTreino");
const btnAddEx = document.getElementById("btnAddEx");

const exerciciosAdicionados = [];

btnAddEx.addEventListener("click", addExercicio);

function addExercicio() {
  const inputNomeEx = document.createElement("input");
  inputNomeEx.type = "text";
  inputNomeEx.placeholder = "Nome do exercício";
  inputNomeEx.classList.add("form-control", "mb-2");

  // Radio buttons para tipo
  const divTipo = document.createElement("div");
  divTipo.classList.add("mb-2");
  divTipo.innerHTML = `
    <label class="form-label fw-semibold terminal-prompt">Tipo</label><br>
    <div class="form-check form-check-inline">
      <input class="form-check-input tipo-radio" type="radio" name="tipoExercicio" value="normal" checked>
      <label class="form-check-label">Normal (reps)</label>
    </div>
    <div class="form-check form-check-inline">
      <input class="form-check-input tipo-radio" type="radio" name="tipoExercicio" value="isometrico">
      <label class="form-check-label">Isométrico (seg)</label>
    </div>
  `;

  const btnConfirmar = document.createElement("button");
  btnConfirmar.textContent = "confirmar_exercicio";
  btnConfirmar.classList.add("btn", "btn-success", "btn-sm", "mb-3", "terminal-command");

  container.appendChild(inputNomeEx);
  container.appendChild(divTipo);
  container.appendChild(btnConfirmar);

  btnConfirmar.addEventListener("click", () => {
    const nomeEx = inputNomeEx.value.trim();

    if (!nomeEx) {
      window.Terminal.showError("Digite o nome do exercício!");
      return;
    }

    // Pega o tipo selecionado
    const tipoSelecionado = document.querySelector('input[name="tipoExercicio"]:checked').value;

    exerciciosAdicionados.push({
      nome: nomeEx,
      tipo: tipoSelecionado
    });

    // Cria card do exercício adicionado no container separado
    const tipoLabel = tipoSelecionado === 'isometrico' ? '⏱️ Isométrico' : '🏋️ Normal';
    const card = document.createElement("div");
    card.classList.add("alert", "alert-success");
    card.textContent = `✅ ${nomeEx} (${tipoLabel})`;

    const containerExercicios = document.getElementById("exerciciosAdicionados");
    containerExercicios.appendChild(card);

    // Remove os inputs
    inputNomeEx.remove();
    divTipo.remove();
    btnConfirmar.remove();

    // Mostra botão de finalizar se tiver pelo menos 1 exercício (sempre no final)
    if (!document.getElementById("btnFinalizar")) {
      const btnFinalizar = document.createElement("button");
      btnFinalizar.id = "btnFinalizar";
      btnFinalizar.textContent = "salvar_treino";
      btnFinalizar.classList.add("btn", "btn-success", "btn-lg", "terminal-command");
      btnFinalizar.addEventListener("click", salvarTreino);

      const containerBotao = document.getElementById("containerBotaoFinalizar");
      containerBotao.appendChild(btnFinalizar);
    }
  });
}

async function salvarTreino() {
  const nomeTreino = document.getElementById("nomeTreino").value.trim();

  if (!nomeTreino) {
    window.Terminal.showError("Digite o nome do treino!");
    return;
  }

  if (exerciciosAdicionados.length === 0) {
    window.Terminal.showError("Adicione pelo menos um exercício!");
    return;
  }

  try {
    const resposta = await fetch("/api/treinos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeTreino,
        exercicios: exerciciosAdicionados
      })
    });

    if (!resposta.ok) {
      throw new Error("Erro ao salvar treino");
    }

    const resultado = await resposta.json();
    window.Terminal.showSuccess(`Treino "${nomeTreino}" criado com sucesso!`);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (erro) {
    window.Terminal.showError("Erro ao salvar treino: " + erro.message);
  }
}
