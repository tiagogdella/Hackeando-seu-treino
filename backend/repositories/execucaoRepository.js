import db from "../../DB/db.js";

export async function criar(treinoId, date, userId ){
    const created = await db.prepare("INSERT INTO execucoes_treino (treino_id, data_execucao, user_id) VALUES (?, ?, ?)").run(treinoId, date, userId);

    return created.lastInsertRowid;
}

export async function buscarPorId(id){
    const selected = await db.prepare("SELECT * FROM execucoes_treino WHERE id =?").get(id);
    
    return selected;
}

export async function buscarUltimaDoTreino(treinoId, userId){
    const ultima = await db.prepare(`
        SELECT et.id, et.data_execucao, et.volume_total
        FROM execucoes_treino et
        WHERE et.treino_id = ? AND et.user_id = ?
        AND EXISTS (SELECT 1 FROM series s WHERE s.execucao_id = et.id)
        ORDER BY et.data_execucao DESC
        LIMIT 1
    `).get(treinoId, userId);

    return ultima;
}

export async function atualizarVolumeTotal(id,volume){
    const result = await db.prepare("UPDATE execucoes_treino SET volume_total = ? WHERE id = ?").run(volume, id);

    return result;
}

export async function listarPorTreino(treinoId, userId){
    const execucao = await db.prepare(`
        SELECT * FROM execucoes_treino 
        WHERE treino_id = ? AND user_id = ? AND volume_total IS NOT NULL
        ORDER BY data_execucao
        `).all(treinoId, userId);

    return execucao;
}