const container = document.getElementById("containerAddTreino");
const btnAddEx = document.getElementById("btnAddEx");

btnAddEx.addEventListener("click", addExFunc);

function addExFunc() {
  const nomeTreino = document.getElementById("nomeTreino").value;

  if (!nomeTreino.trim()) {
    alert("Digite o nome do treino antes!");
    return;
  }

  const bloco = document.createElement("div");
  bloco.classList.add("card", "p-3", "mb-3", "shadow-sm");

  bloco.innerHTML = `
    <h5 class="mb-3">${nomeTreino}</h5>

    <div class="mb-2">
      <label class="form-label fw-semibold">Séries:</label>
      <input type="number" min="1" max="10" value="1" class="form-control series-input">
    </div>

    <div class="mb-2">
      <label class="form-label fw-semibold">Peso:</label>
      <input type="number" min="1" value="1" class="form-control peso-input">
    </div>

    <div class="box-reps"></div>
  `;

  container.appendChild(bloco);
  document.getElementById("idRemover").remove();

  const seriesInput = bloco.querySelector(".series-input");
  const boxReps = bloco.querySelector(".box-reps");

  function gerarReps(qtd) {
    boxReps.innerHTML = "";
    for (let i = 1; i <= qtd; i++) {
      boxReps.innerHTML += `
        <div class="mb-2">
          <label class="form-label">Repetições ${i}:</label>
          <input type="number" min="1" class="form-control">
        </div>
      `;
    }
  }

  gerarReps(seriesInput.value);
  seriesInput.addEventListener("input", () => gerarReps(seriesInput.value));
}
