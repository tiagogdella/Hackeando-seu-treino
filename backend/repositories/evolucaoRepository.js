import db from "../../DB/db.js";

export async function listarExecucoesFinalizadas(userId) {
    const execucoes = await db.prepare(`
        SELECT treino_id, data_execucao, volume_total
        FROM execucoes_treino
        WHERE user_id = ? AND volume_total IS NOT NULL
        ORDER BY treino_id, data_execucao ASC
    `).all(userId);
    return execucoes;
}
