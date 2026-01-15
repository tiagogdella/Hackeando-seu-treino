// Treino exemplo como se fosse import
treino = {
  nome: "Peito e Tríceps",
  data: "2026-01-07",
  exercicios: [
    {
      nome: "Supino Reto",
      series: [
        { reps: 10, peso: 80 },
        { reps: 9,  peso: 80 },
        { reps: 8,  peso: 80 }
    ]
    },
    {
      nome: "Crucifixo Máquina",
      series: [
        { reps: 12, peso: 40 },
        { reps: 11, peso: 40 },
        { reps: 10, peso: 40 }
      ]
    },
    {
      nome: "Tríceps Testa",
      series: [
        { reps: 10, peso: 30 },
        { reps: 9,  peso: 30 },
        { reps: 8,  peso: 30 }
      ]
    }
  ]
}

//Volume total = reps × peso (somado de todas as séries)
//Mais carga = mais progressive - 54kg a + de peso
//Formula de Epley para 1RM vai metrificar o progressive =
//Epley = 1RM = peso × (1 + reps / 30)
//Exemplo: Treino 1:
//1RM = 80 × (1 + 8/30)  = 101,3 kg
//Treino 2:
//1RM = 80 × (1 + 10/30) = 106,6 kg = 5,2% de aumento
//Agora precisamos levar em consideração o volume do treino
//Total = (80x(1+10/30))+(80x(1+9/30))+(80x(1+8/30))= 
//106,66 + 104,00 + 101,33 = 311,99
//Dessa forma treinos podem ser comparados a si mesmo, 
// no quisito carga,repetições ou numeros de exercicios.
//Porem, não podem ser comparados a outros treinos. 
//lEVAR EM CONTA JunkVolume - pesos das series 

function getPesoSerie(index) {
  const pesos = [
    1.0,  // 1
    1.0,  // 2
    1.0,  // 3
    0.9,  // 4
    0.9,  // 5
    0.8,  // 6
    0.8,  // 7
    0.7,  // 8
    0.6,  // 9
    0.55, // 10
    0.4,  // 11
    0.3,  // 12
    0.2,  // 13
    0.1,  // 14
    0.1   // 15
  ]

  return pesos[index] ?? 0.05
}

function calcularVolumeExercicio(exercicio, contadorSeries) {
  let volumeExercicio = 0

  exercicio.series.forEach(serie => {
    const peso = Number(serie.peso)
    const reps = Number(serie.reps)

    const rmEstimado = peso * (1 + reps / 30)

    const pesoSerie = getPesoSerie(contadorSeries.valor)

    volumeExercicio += rmEstimado * pesoSerie

    contadorSeries.valor++ // avança globalmente
  })

  return volumeExercicio
}

function calcularVolumeTreino(exercicios) {
  let volumeTreino = 0
  const contadorSeries = { valor: 0 }

  exercicios.forEach(exercicio => {
    const volumeEx = calcularVolumeExercicio(exercicio, contadorSeries)
    console.log(
      `Volume ${exercicio.nome}:`,
      volumeEx.toFixed(2),
      `| Série final: ${contadorSeries.valor}`
    )
    volumeTreino += volumeEx
  })

  return volumeTreino
}

const volumeTotalTreino = calcularVolumeTreino(treino.exercicios)

document.getElementById('resultado').innerText =
  `Volume total do treino: ${volumeTotalTreino.toFixed(2)}`




