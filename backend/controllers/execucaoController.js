import * as execucaoService from '../services/execucaoService.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function iniciar(req, res){
    const created = await execucaoService.iniciar(req.params.id, req.user.id);
    return res.json(created);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function buscarUltimo(req, res){
    const last = await execucaoService.buscarUltimo(req.params.id, req.user.id);
    return res.json(last);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function adicionarSerie(req, res){
    const added = await execucaoService.adicionarSerie(req.params.id, req.user.id, req.body);
    return res.json({ sucesso: true });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function finalizar(req, res){
    const finalized = await execucaoService.finalizar(req.params.id, req.user.id);
    return res.json({sucesso: true, ...finalized});
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function obterComSeries(req, res){
    const result = await execucaoService.obterComSeries(req.params.id, req.user.id);
    return res.json(result);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function progressao(req, res){
    const progre = await execucaoService.progressao(req.params.id, req.user.id);
    return res.json(progre);
}