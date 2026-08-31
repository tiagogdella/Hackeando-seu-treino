import * as evolucaoService from '../services/evolucaoService.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function dashboard(req, res) {
    const resultado = await evolucaoService.dashboard(req.user.id)
    return res.json(resultado)
}
