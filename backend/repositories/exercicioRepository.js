import db from "../../DB/db.js";

export async function buscarPorNome(nome) {
    const exercicio = await db.prepare("SELECT id FROM exercicios WHERE nome = ?").get(nome);
    return exercicio;
}

export async function criar(nome) {
    const result = await db.prepare("INSERT INTO exercicios (nome) VALUES (?)").run(nome);
    return result.lastInsertRowid;
}