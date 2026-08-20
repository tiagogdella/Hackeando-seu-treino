import * as usuarioRepository from "../repositories/usuarioRepository.js";
import bcrypt from 'bcryptjs';
import { assinarToken } from "../utils/jwt.js";
import { ValidationError, ConflictError, UnauthorizedError } from "../errors/AppError.js";

export async function login(username, password) {
    if (!username || !password) throw new ValidationError('Username e senha são obrigatórios');

    const user = await usuarioRepository.buscarPorUsernameAtivo(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new UnauthorizedError('Usuário ou senha inválidos');

    await usuarioRepository.atualizarUltimoLogin(user.id, new Date().toISOString());

    const token = assinarToken({ userId: user.id, username: user.username });

    return { token, usuario: { id: user.id, username: user.username, nome_completo: user.nome_completo} }
}

export async function registrar({ username, password, nome_completo }){
    if (!username || !password) throw new ValidationError('Usuário e senha são obrigatórios');
    if (username.length < 3 || password.length < 6) throw new ValidationError('Falta caracteres');
    
    const user = await usuarioRepository.existePorUsername(username);
    if (user) throw new ConflictError('Usuário já existe');

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await usuarioRepository.criar({ username, passwordHash, nomeCompleto: nome_completo || null, dataCriacao: new Date().toISOString() });

    const token = assinarToken({ userId: created, username: username });
    
    return { token, usuario: { id: created, username, nome_completo: nome_completo || null } };
}