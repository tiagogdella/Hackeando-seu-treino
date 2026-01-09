import express from "express";
import db from "./db.js"; // seu arquivo que conecta ao SQLite

const app = express();
app.use(express.json());

// ➜ SALVA TREINO NO BANCO
app.post("/api/treinos", (req, res) => {
  const treino = req.body;

  const stmt = db.prepare(`
    INSERT INTO treinos (
      nome, exercicios,
      primeiro_ex, series_pri_ex, peso_pri_ex, reps_pri_ex,
      segundo_ex, series_seg_ex, peso_seg_ex, reps_seg_ex,
      terceiro_ex, series_ter_ex, peso_ter_ex, reps_ter_ex
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    treino.nome,
    treino.exercicios,
    treino.primeiro_ex, treino.series_pri_ex, treino.peso_pri_ex, JSON.stringify(treino.reps_pri_ex),
    treino.segundo_ex, treino.series_seg_ex, treino.peso_seg_ex, JSON.stringify(treino.reps_seg_ex),
    treino.terceiro_ex, treino.series_ter_ex, treino.peso_ter_ex, JSON.stringify(treino.reps_ter_ex)
  );

  res.json({ ok: true });
});

// ➜ RETORNAR TODOS OS TREINOS
app.get("/api/treinos", (req, res) => {
  const rows = db.prepare("SELECT * FROM treinos").all();

  // transforma JSON de volta para array
  rows.forEach(t => {
    t.reps_pri_ex = JSON.parse(t.reps_pri_ex);
    t.reps_seg_ex = JSON.parse(t.reps_seg_ex);
    t.reps_ter_ex = JSON.parse(t.reps_ter_ex);
  });

  res.json(rows);
});

