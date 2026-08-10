import db from "../../DB/db.js";


export async function listarPorUsuario(userId) {
    const treinos = await db.prepare(`
      SELECT
        t.id,
        t.nome,
        t.data_criacao,
        t.ativo,
        COUNT(DISTINCT CASE WHEN e.volume_total IS NOT NULL THEN e.id END) as total_execucoes
      FROM treinos t
      LEFT JOIN execucoes_treino e ON e.treino_id = t.id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.id DESC
    `).all(userId);
    return treinos;
}

export async function buscarPorId(id) {
    const treino = await db.prepare("SELECT * FROM treinos WHERE id = ?").get(id);
    return treino
}

export async function buscarExerciciosDoTreino(treinoId) {
    const exercicios = await db.prepare(`
        SELECT e.id, e.nome, te.ordem, te.tipo
        FROM exercicios e
        JOIN treino_exercicios te ON te.exercicio_id = e.id
        WHERE te.treino_id = ?
        ORDER BY te.ordem
    `).all(treinoId);
    return exercicios;
}

export async function criar({ nome, data_criacao, userId }) {
    const result = await db.prepare("INSERT INTO treinos (nome, data_criacao, user_id) VALUES (?, ?, ?)").run(nome, data_criacao, userId);
    return result.lastInsertRowid;
}

export async function vincularExercicio(treinoId, exercicioId, ordem, tipo) {
    const result = await db.prepare("INSERT INTO treino_exercicios (treino_id, exercicio_id, ordem, tipo) VALUES (?, ?, ?, ?)").run(treinoId, exercicioId, ordem, tipo);
    return result;
}

export async function atualizarNome(id, nome){
    const updated = await db.prepare("UPDATE treinos SET nome = ? WHERE id = ?").run(nome.trim(), id);
    return updated;
}

export async function atualizarAtivo(id, userId, ativo) {
    const updated = await db.prepare(
        'UPDATE treinos SET ativo = ? WHERE id = ? AND user_id = ?'
    ).run(ativo ? 1 : 0, id, userId)
    return updated;
}

export async function removerId(id) {
    const removed = await db.prepare(
        'DELETE FROM treinos WHERE id = ?'
    ).run(id);
    return removed;
}

export async function buscarUltimaOrdem(treinoId){
    const ultimaOrdem = await db.prepare(`
        SELECT MAX(ordem) as max_ordem FROM treino_exercicios WHERE treino_id = ?
        `).get(treinoId);
    return ultimaOrdem
}


 
 
