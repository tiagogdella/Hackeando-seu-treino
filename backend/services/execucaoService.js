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
    if (series.length === 0) throw new ValidationError("Execução sem series");

    const volumeTotal = calcularVolume1RM(series);

    const updated = await execucaoRepository.atualizarVolumeTotal(exec.id, volumeTotal);

    return {volume_total: volumeTotal};
}