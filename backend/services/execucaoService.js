import * as treinoRepository from "../repositories/treinoRepository.js";
import * as execucaoRepository from "../repositories/execucaoRepository.js";
import * as seriesRepository from "../repositories/serieRepository.js";
import { NotFoundError, ValidationError } from "../errors/AppError.js";
import { calcularVolume1RM } from "../logic/ProgressiveLogic.js";

export async function iniciar(treinoId, userId){
    const treino = await treinoRepository.buscarPorId(treinoId);

    if(!treino || treino.user_id !== userId) throw new NotFoundError("Treino não encontrado");
    
    const data = new Date().toISOString()

    const criado = await execucaoRepository.criar(treinoId, data, userId)

    return {execucao_id: criado, data_execucao: data};
}

export async function buscarUltimo(treinoId, userId) {
    const exec = await execucaoRepository.buscarUltimaDoTreino(treinoId, userId);

    if (!exec) return {existe: false};

    const series = await seriesRepository.listarPorExecucao(exec.id);

    const seriesPorExercicio = {};
    series.forEach(s => {
        if (!seriesPorExercicio[s.exercicio_id]) {
            seriesPorExercicio[s.exercicio_id] = {
                exercicio_id: s.exercicio_id,
                exercicio_nome: s.exercicio_nome,
                series: []
            };
        }
        seriesPorExercicio[s.exercicio_id].series.push({
            peso: s.peso,
            repeticoes: s.repeticoes
        });
    });

    return {existe: true, data: exec.data_execucao, volume_total: exec.volume_total, series_por_exercicio: Object.values(seriesPorExercicio)};
}

export async function finalizar(execucaoId, userId){
    const exec = await execucaoRepository.buscarPorId(execucaoId);
    if(!exec || exec.user_id !== userId) throw new NotFoundError("Execução não encontrada");

    const series = await seriesRepository.listarPorExecucao(exec.id);
    if (series.length === 0) throw new ValidationError("Execução sem séries");

    const volumeTotal = calcularVolume1RM(series);

    await execucaoRepository.atualizarVolumeTotal(exec.id, volumeTotal);

    return { volume_total: volumeTotal };
}

export async function adicionarSerie(execucaoId, userId, dados) {
    const exec = await execucaoRepository.buscarPorId(execucaoId);
    if (!exec || exec.user_id !== userId) throw new NotFoundError("Execução não encontrada");

    if (dados.exercicio_id == null || dados.peso == null || dados.repeticoes == null || dados.ordem == null) throw new ValidationError("Serie sem dados")

    const added = await seriesRepository.criar(execucaoId, dados.exercicio_id, dados.peso, dados.repeticoes, dados.ordem);

    return added;

}

export async function obterComSeries(execucaoId, userId) {
    const exec = await execucaoRepository.buscarPorId(execucaoId);
    if (!exec || exec.user_id !== userId) throw new NotFoundError("Execução não encontrada");

    const result = await seriesRepository.listarPorExecucao(exec.id);

    return { ...exec, series: result };
}

export async function progressao(treinoId, userId) {
    let exec = await execucaoRepository.listarPorTreino(treinoId, userId);
    if (exec.length === 0) {
        return { base: null, ultimo: null, atual: null, progresso_percentual: null, delta_volume: null };
    }

    const base = exec[0];
    const atual = exec[exec.length-1];
    let ultimo = null;
    let somaUltimo = null;
    let somaAtual = null;
    let delta_volume = null;
    let progresso_percentual = null;
    let delta_reps_por_exercicio = [];

    if (exec.length > 1) {
        ultimo = exec[(exec.length - 2)];
        somaUltimo = await seriesRepository.somarRepeticoesPorExercicio(ultimo.id);
        somaAtual = await seriesRepository.somarRepeticoesPorExercicio(atual.id);

        somaAtual.forEach(atualEx => {
            const ultimoEx = somaUltimo.find(u => u.exercicio_id === atualEx.exercicio_id);
            if (ultimoEx) {
                delta_reps_por_exercicio.push({
                    exercicio_nome: atualEx.exercicio_nome,
                    delta_reps: atualEx.total_reps - ultimoEx.total_reps
                });
            }
        });
    }

    if (base.volume_total != null && atual.volume_total != null) {
        delta_volume = atual.volume_total - base.volume_total;
        progresso_percentual = parseFloat(((delta_volume / base.volume_total) * 100).toFixed(2));
    }

    return { base, ultimo, atual, progresso_percentual, delta_volume, delta_reps_por_exercicio };
}