import * as authService from "../services/authService.js";

/**
 * @param {import('express').Response} res
 */
function setCookieAuth(res, token) {
    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
    })
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function login(req, res) {
    const { token, usuario } = await authService.login(req.body.username, req.body.password);
    
    setCookieAuth(res, token);

    res.json({ sucesso: true, usuario})
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function registrar(req, res) {
    const { token, usuario } = await authService.registrar(req.body);

    setCookieAuth(res, token);

    res.json({ sucesso: true, usuario });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function logout(req, res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    })

    res.json({ sucesso: true })
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function status(req, res) {
    if (req.user) {
        res.json({
            autenticado: true,
            usuario: {
                id: req.user.id,
                username: req.user.username,
                nome_completo: req.user.nome_completo
            }
        });
    } else {
   res.json({ autenticado: false });
    }
}