import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcular1RM,
  calcularVolume1RM,
  calcularVolumeExercicio,
  calcularProgressaoPercentual,
  calcularDeltaReps
} from './ProgressiveLogic.js';

describe('calcular1RM', () => {
  test('aplica a fórmula de Epley', () => {
    assert.equal(calcular1RM(100, 10), 100 * (1 + 10 / 30));
  });

  test('com 0 repetições, devolve o próprio peso', () => {
    assert.equal(calcular1RM(50, 0), 50);
  });
});

describe('calcularVolume1RM', () => {
  test('uma série só não sofre fadiga (multiplicador 1.0)', () => {
    const series = [{ peso: 100, repeticoes: 10, ordem: 1 }];
    assert.equal(calcularVolume1RM(series), calcular1RM(100, 10));
  });

  test('a 4ª série sofre fadiga (multiplicador 0.9, não 1.0)', () => {
    const series = [
      { peso: 100, repeticoes: 10, ordem: 1 },
      { peso: 100, repeticoes: 10, ordem: 2 },
      { peso: 100, repeticoes: 10, ordem: 3 },
      { peso: 100, repeticoes: 10, ordem: 4 }
    ];
    const rm = calcular1RM(100, 10);
    const esperado = rm * 1.0 + rm * 1.0 + rm * 1.0 + rm * 0.9;
    assert.equal(calcularVolume1RM(series), esperado);
  });

  test('reordena as séries pela "ordem", mesmo fora de sequência no array', () => {
    const s1 = { peso: 100, repeticoes: 10, ordem: 1 };
    const s2 = { peso: 80, repeticoes: 8, ordem: 2 };
    const s3 = { peso: 60, repeticoes: 12, ordem: 3 };
    const s4 = { peso: 50, repeticoes: 15, ordem: 4 };

    const esperado =
      calcular1RM(100, 10) * 1.0 +
      calcular1RM(80, 8) * 1.0 +
      calcular1RM(60, 12) * 1.0 +
      calcular1RM(50, 15) * 0.9;

    // array de entrada embaralhado de propósito
    assert.equal(calcularVolume1RM([s3, s1, s4, s2]), esperado);
  });

  test('a partir da 16ª série, usa o fator mínimo de fadiga (0.05)', () => {
    const fatores = [1.0, 1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 0.7, 0.6, 0.55, 0.4, 0.3, 0.2, 0.1, 0.1, 0.05];
    const series = fatores.map((_, i) => ({ peso: 10, repeticoes: 5, ordem: i + 1 }));

    const rm = calcular1RM(10, 5);
    let esperado = 0;
    for (const fator of fatores) esperado += rm * fator;

    assert.equal(calcularVolume1RM(series), esperado);
  });
});

describe('calcularVolumeExercicio', () => {
  test('delega pra calcularVolume1RM (mesmo resultado, mesma entrada)', () => {
    const series = [{ peso: 100, repeticoes: 10, ordem: 1 }];
    assert.equal(calcularVolumeExercicio(series), calcularVolume1RM(series));
  });
});

describe('calcularProgressaoPercentual', () => {
  test('progressão positiva', () => {
    assert.equal(calcularProgressaoPercentual(100, 120), 20);
  });

  test('progressão negativa (regressão)', () => {
    assert.equal(calcularProgressaoPercentual(100, 80), -20);
  });

  test('volumeBase igual a 0 devolve 0 (evita divisão por zero)', () => {
    assert.equal(calcularProgressaoPercentual(0, 120), 0);
  });

  test('volumeBase null devolve 0', () => {
    assert.equal(calcularProgressaoPercentual(null, 120), 0);
  });
});

describe('calcularDeltaReps', () => {
  test('soma as repetições e devolve a diferença', () => {
    const seriesBase = [{ repeticoes: 10 }, { repeticoes: 8 }];
    const seriesAtual = [{ repeticoes: 12 }, { repeticoes: 10 }];
    assert.equal(calcularDeltaReps(seriesBase, seriesAtual), 4);
  });

  test('arrays vazios devolvem 0, não NaN', () => {
    assert.equal(calcularDeltaReps([], []), 0);
  });
});
