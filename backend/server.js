import express from "express";
import db from "../DB/db.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* =========================
   TREINOS
========================= */

// criar treino
app.post("/treinos", (req, res) => {
  const { nome } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({ erro: "Nome do treino é obrigatório" });
  }

  const data = new Date().toISOString().split("T")[0];

  const result = db
    .prepare("INSERT INTO treinos (nome, data) VALUES (?, ?)")
    .run(nome, data);

  res.json({ id: result.lastInsertRowid, nome, data });
});

// listar treinos
app.get("/api/treinos", (req, res) => {
  const treinos = db
    .prepare("SELECT id, nome, data FROM treinos ORDER BY id DESC")
    .all();

  res.json(treinos);
});

/* =========================
   EXERCÍCIOS
========================= */

// verificar se exercício já tem base
app.get("/api/exercicios/:nome", (req, res) => {
  const { nome } = req.params;

  const exercicio = db
    .prepare("SELECT * FROM exercicios_base WHERE nome = ?")
    .get(nome);

  res.json(exercicio || null);
});

// salvar exercício base (1ª vez)
app.post("/api/exercicios/base", (req, res) => {
  const { nome, volume_base } = req.body;

  if ((!nome || nome.trim() === "")|| volume_base == null) {
    return res.status(400).json({ erro: "Dados incompletos" });
  }

  // proteção contra duplicação
  const existente = db
    .prepare("SELECT id FROM exercicios_base WHERE nome = ?")
    .get(nome);

  if (existente) {
    return res.json({ id: existente.id });
  }

  const data_base = new Date().toISOString().split("T")[0];

  const result = db
    .prepare(
      "INSERT INTO exercicios_base (nome, volume_base, data_base) VALUES (?, ?, ?)"
    )
    .run(nome, volume_base, data_base);

  res.json({ id: result.lastInsertRowid });
});

/* =========================
   PROGRESSO
========================= */

app.post("/api/progresso", (req, res) => {
  const { exercicio_id, treino_id, volume_total } = req.body;

  // valida exercício
  const exercicio = db
    .prepare("SELECT volume_base FROM exercicios_base WHERE id = ?")
    .get(exercicio_id);

  if (!exercicio) {
    return res.status(404).json({ erro: "Exercício não encontrado" });
  }

  // valida treino
  const treino = db
    .prepare("SELECT id FROM treinos WHERE id = ?")
    .get(treino_id);

  if (!treino) {
    return res.status(404).json({ erro: "Treino não encontrado" });
  }

  const delta = volume_total - exercicio.volume_base;
  const data = new Date().toISOString().split("T")[0];

  db.prepare(`
    INSERT INTO progresso_exercicio
    (exercicio_id, treino_id, delta_volume, volume_total, data)
    VALUES (?, ?, ?, ?, ?)
  `).run(exercicio_id, treino_id, delta, volume_total, data);

  res.json({ sucesso: true, delta });
});

app.listen(3000, () => {
  console.log("🔥 Servidor rodando em http://localhost:3000");
});

