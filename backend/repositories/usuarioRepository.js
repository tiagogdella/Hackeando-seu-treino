import db from "../../DB/db.js";

export async function buscarPorUsernameAtivo(username) {
    const user = await db.prepare(`
        SELECT *
        FROM usuarios 
        WHERE username = ? COLLATE NOCASE AND ativo = 1    
    `).get(username);

    return user;
}

export async function existePorUsername(username) {
    const result = await db.prepare(`
        SELECT id 
        FROM usuarios
        WHERE username = ? COLLATE NOCASE    
    `).get(username);

    return result;
}

export async function criar({ username, passwordHash, nomeCompleto, dataCriacao }) {
    const result = await db.prepare(`
        INSERT INTO usuarios
        (username, password_hash, nome_completo, data_criacao, ativo) VALUES (?, ?, ?, ?, 1)   
    `).run(username, passwordHash, nomeCompleto, dataCriacao);

    return result.lastInsertRowid;
}

export async function atualizarUltimoLogin(id, data) {
    const updated = await db.prepare(`
        UPDATE usuarios
        SET ultimo_login = ?
        WHERE id = ?    
    `).run(id, data);

    return updated;
}

export async function buscarPorId(id) {
    const result = await db.prepare(`
        SELECT id, username, nome_completo
        FROM usuarios
        WHERE id = ? AND ativo = 1     
    `).get(id);

    return result;
}