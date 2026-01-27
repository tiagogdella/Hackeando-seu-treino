/**
 * Lógica de Progressive Overload usando a Fórmula de Epley
 *
 * Fórmula: 1RM = peso × (1 + reps / 30)
 *
 * Conceitos:
 * - Volume do exercício = soma dos 1RM estimados de todas as séries
 * - Fator de fadiga aplicado (junk volume) baseado na ordem da série
 * - Treinos só devem ser comparados consigo mesmos (Base → Último → Atual)
 */

/**
 * Retorna o multiplicador de peso baseado no índice da série (fadiga)
 * Séries iniciais têm peso 1.0, séries posteriores têm peso reduzido
 *
 * @param {number} index - Índice da série (0-based)
 * @returns {number} Multiplicador de peso (0.05 a 1.0)
 */
function getPesoSerie(index) {
  const pesos = [
    1.0,  // 1ª série
    1.0,  // 2ª série
    1.0,  // 3ª série
    0.9,  // 4ª série
    0.9,  // 5ª série
    0.8,  // 6ª série
    0.8,  // 7ª série
    0.7,  // 8ª série
    0.6,  // 9ª série
    0.55, // 10ª série
    0.4,  // 11ª série
    0.3,  // 12ª série
    0.2,  // 13ª série
    0.1,  // 14ª série
    0.1   // 15ª série
  ];

  return pesos[index] ?? 0.05; // Séries 16+ têm peso mínimo
}

/**
 * Calcula o 1RM estimado usando a Fórmula de Epley
 *
 * @param {number} peso - Peso utilizado na série
 * @param {number} repeticoes - Repetições realizadas
 * @returns {number} 1RM estimado
 */
export function calcular1RM(peso, repeticoes) {
  return peso * (1 + repeticoes / 30);
}

/**
 * Calcula o volume total de uma execução de treino
 * Aplica fator de fadiga (junk volume) baseado na ordem global das séries
 *
 * @param {Array} series - Array de séries no formato: [{peso, repeticoes, ordem}, ...]
 * @returns {number} Volume total calculado
 */
export function calcularVolume1RM(series) {
  let volumeTotal = 0;

  // Ordena séries pela ordem para aplicar fadiga corretamente
  const seriesOrdenadas = [...series].sort((a, b) => a.ordem - b.ordem);

  seriesOrdenadas.forEach((serie, index) => {
    const peso = Number(serie.peso);
    const reps = Number(serie.repeticoes);

    // Calcula 1RM estimado para a série
    const rmEstimado = calcular1RM(peso, reps);

    // Aplica fator de fadiga
    const pesoSerie = getPesoSerie(index);

    // Acumula no volume total
    volumeTotal += rmEstimado * pesoSerie;
  });

  return volumeTotal;
}

/**
 * Calcula o volume de um exercício específico
 *
 * @param {Array} seriesDoExercicio - Array de séries de um único exercício
 * @returns {number} Volume do exercício
 */
export function calcularVolumeExercicio(seriesDoExercicio) {
  return calcularVolume1RM(seriesDoExercicio);
}

/**
 * Calcula a progressão percentual entre dois volumes
 *
 * @param {number} volumeBase - Volume inicial (baseline)
 * @param {number} volumeAtual - Volume atual
 * @returns {number} Percentual de progressão
 */
export function calcularProgressaoPercentual(volumeBase, volumeAtual) {
  if (volumeBase === 0 || volumeBase == null) {
    return 0;
  }

  const delta = volumeAtual - volumeBase;
  return (delta / volumeBase) * 100;
}

/**
 * Calcula o delta de repetições entre duas execuções
 *
 * @param {Array} seriesBase - Séries da execução base
 * @param {Array} seriesAtual - Séries da execução atual
 * @returns {number} Diferença total de repetições
 */
export function calcularDeltaReps(seriesBase, seriesAtual) {
  const repsBase = seriesBase.reduce((sum, s) => sum + Number(s.repeticoes), 0);
  const repsAtual = seriesAtual.reduce((sum, s) => sum + Number(s.repeticoes), 0);

  return repsAtual - repsBase;
}
