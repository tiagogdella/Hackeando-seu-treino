import * as treinoService from "../services/treinoService.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function listar(req, res) {
    const treinos = await treinoService.listar(req.user.id);

    return res.json(treinos);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function criar(req, res) {
    const treino = await treinoService.criar(req.user.id, req.body);

    return res.json(treino)
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function obter(req, res){
    const treino = await treinoService.obterComExercicios(req.params.id, req.user.id);

    return res.json(treino);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function atualizarNome(req, res) {
    const nome = await treinoService.atualizarNome(req.params.id, req.user.id, req.body.nome);

    return res.json({ sucesso: true, nome })
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function atualizarAtivo(req, res) {
    const updated = await treinoService.atualizarAtivo(req.params.id, req.user.id, req.body.ativo);

    return res.json({ ok: true });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function excluir(req, res) {
    const deleted = await treinoService.excluir(req.params.id, req.user.id);

    return res.json({ sucesso: true });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function adicionarExercicio(req, res) {
    const added = await treinoService.adicionarExercicio(req.params.id, req.user.id, req.body.nome);

    return res.json({ sucesso: true, ...added });
}

