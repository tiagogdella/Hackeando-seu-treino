import db from "../../DB/db.js";

export async function criar(execId, exercicioId, peso, repeticoes, ordem){
    const posted = await db.prepare("INSERT INTO series (execucao_id, exercicio_id, peso, repeticoes, ordem) VALUES (?, ?, ?, ?, ?)").run(execId, exercicioId, peso, repeticoes, ordem);
    
    return posted;
}

export async function listarPorExecucao(execId) {
    const series = await db.prepare(`
       SELECT s.*, e.nome as exercicio_nome
       FROM series s
       JOIN exercicios e ON e.id = s.exercicio_id
       WHERE s.execucao_id = ?
       ORDER BY s.exercicio_id, s.ordem
    `).all(execId);

    return series;
}

export async function somarRepeticoesPorExercicio(execId) {
    const soma = await db.prepare(`
        SELECT e.nome as exercicio_nome, s.exercicio_id, SUM(s.repeticoes) as total_reps
        FROM series s
        JOIN exercicios e ON e.id = s.exercicio_id
        WHERE s.execucao_id = ?
        GROUP BY s.exercicio_id
    `).all(execId);

    return soma;
}