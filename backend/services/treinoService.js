import { NotFoundError, ValidationError } from "../errors/AppError.js";
import { listarPorUsuario, criar as criarTreino, vincularExercicio, buscarPorId, buscarExerciciosDoTreino, atualizarAtivo, atualizarNome as atualizarNomeTreino } from "../repositories/treinoRepository.js";
import * as exercicioRepository from "../repositories/exercicioRepository.js";

export function listar(userId) {
    return listarPorUsuario(userId);
}

export async function criar(userId, { nome, exercicios }) {
    if (!nome || nome.trim() === "") throw new ValidationError("Invalid name");

    const data_criacao = new Date().toISOString();

    const result = await criarTreino({nome, data_criacao, userId})

    if (exercicios && Array.isArray(exercicios)) {
      for (const [index, ex] of exercicios.entries()) {
        const nomeInicial = typeof ex === 'string' ? ex : ex.nome;
        const tipoExercicio = typeof ex === 'string' ? 'normal' : (ex.tipo || 'normal');

        const nomeEx = await exercicioRepository.buscarPorNome(nomeInicial);

        let exercicioId;
        if (nomeEx) {
            exercicioId = nomeEx.id;
        } else {
            exercicioId = await exercicioRepository.criar(nomeInicial);
        }
        
        await vincularExercicio(result, exercicioId, index + 1, tipoExercicio)
      }
    }

    return { id: result, nome, data_criacao };
}

export async function obterComExercicios(id, userId) {
    const treino = await buscarPorId(id);
    if(!treino || treino.user_id !== userId) throw new NotFoundError('Treino não encontrado');

    const result = await buscarExerciciosDoTreino(id)

    return { ... treino, exercicios: result };
}

export async function atualizarNome(id, userId, nome) {
    if (!nome || nome.trim() === "") throw new ValidationError("Nome do treino é obrigatório");

    const treino = await buscarPorId(id);
    if (!treino || treino.user_id !== userId) throw new NotFoundError('Treino não encontrado');
    
    const nomeTratado = nome.trim();
    await atualizarNomeTreino(id, nomeTratado);
    return nomeTratado;
}