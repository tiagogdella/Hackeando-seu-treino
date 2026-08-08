import express from "express";
import db, { initDB } from "../DB/db.js";
import { calcularVolume1RM } from "./logic/ProgressiveLogic.js";
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import cors from "cors";
import cookieParser from 'cookie-parser';
import { AppError } from "./errors/AppError.js";

const app = express();
app.use(express.json());
app.use(cookieParser())
app.use(cors({
  origin: "https://tiagogdella.github.io",
  credentials: true
}));
app.use(express.static("docs"));
app.use('/api/auth', authRoutes);

/* =========================
   TREINOS (Templates) 
========================= */
app.patch('/api/treinos/:id/ativo', requireAuth, async (req, res) => {
  const { ativo } = req.body
  await db.prepare(
    'UPDATE treinos SET ativo = ? WHERE id = ? AND user_id = ?'
  ).run(ativo ? 1 : 0, req.params.id, req.user.id)
  res.json({ ok: true })
})

app.post("/api/treinos", requireAuth, async (req, res) => {
  const { nome, exercicios } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({ erro: "Nome do treino é obrigatório" });
  }

  const data_criacao = new Date().toISOString();

  try {
    const result = await db.prepare("INSERT INTO treinos (nome, data_criacao, user_id) VALUES (?, ?, ?)").run(nome, data_criacao, req.user.id);
    const treino_id = result.lastInsertRowid;

    if (exercicios && Array.isArray(exercicios)) {
      for (const [index, ex] of exercicios.entries()) {
        const nomeExercicio = typeof ex === 'string' ? ex : ex.nome;
        const tipoExercicio = typeof ex === 'string' ? 'normal' : (ex.tipo || 'normal');

        let exercicio = await db.prepare("SELECT id FROM exercicios WHERE nome = ?").get(nomeExercicio);

        if (!exercicio) {
          const resEx = await db.prepare("INSERT INTO exercicios (nome) VALUES (?)").run(nomeExercicio);
          exercicio = { id: resEx.lastInsertRowid };
        }

        await db.prepare("INSERT INTO treino_exercicios (treino_id, exercicio_id, ordem, tipo) VALUES (?, ?, ?, ?)").run(treino_id, exercicio.id, index + 1, tipoExercicio);
      }
    }

    res.json({ id: treino_id, nome, data_criacao });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.get("/api/treinos", requireAuth, async (req, res) => {
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
  `).all(req.user.id);

  res.json(treinos);
});

app.get("/api/treinos/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const treino = await db.prepare("SELECT * FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);

  if (!treino) {
    return res.status(404).json({ erro: "Treino não encontrado" });
  }

  const exercicios = await db.prepare(`
    SELECT e.id, e.nome, te.ordem, te.tipo
    FROM exercicios e
    JOIN treino_exercicios te ON te.exercicio_id = e.id
    WHERE te.treino_id = ?
    ORDER BY te.ordem
  `).all(id);

  res.json({ ...treino, exercicios });
});

app.patch("/api/treinos/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({ erro: "Nome do treino é obrigatório" });
  }

  try {
    const treino = await db.prepare("SELECT id FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!treino) {
      return res.status(404).json({ erro: "Treino não encontrado" });
    }

    await db.prepare("UPDATE treinos SET nome = ? WHERE id = ?").run(nome.trim(), id);
    res.json({ sucesso: true, nome: nome.trim() });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete("/api/treinos/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const treino = await db.prepare("SELECT id FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!treino) {
      return res.status(404).json({ erro: "Treino não encontrado" });
    }

    await db.prepare("DELETE FROM treinos WHERE id = ?").run(id);

    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/treinos/:id/exercicios", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({ erro: "Nome do exercício é obrigatório" });
  }

  try {
    const treino = await db.prepare("SELECT id FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!treino) {
      return res.status(404).json({ erro: "Treino não encontrado" });
    }

    let exercicio = await db.prepare("SELECT id FROM exercicios WHERE nome = ?").get(nome);
    if (!exercicio) {
      const result = await db.prepare("INSERT INTO exercicios (nome) VALUES (?)").run(nome);
      exercicio = { id: result.lastInsertRowid };
    }

    const ultimaOrdem = await db.prepare("SELECT MAX(ordem) as max_ordem FROM treino_exercicios WHERE treino_id = ?").get(id);
    const ordem = (ultimaOrdem?.max_ordem || 0) + 1;

    await db.prepare("INSERT INTO treino_exercicios (treino_id, exercicio_id, ordem) VALUES (?, ?, ?)").run(id, exercicio.id, ordem);

    res.json({ sucesso: true, exercicio_id: exercicio.id, ordem });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/* =========================
   EXECUÇÕES DE TREINO
========================= */

app.get("/api/treinos/:id/ultimo", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const ultimaExecucao = await db.prepare(`
      SELECT et.id, et.data_execucao, et.volume_total
      FROM execucoes_treino et
      WHERE et.treino_id = ? AND et.user_id = ?
        AND EXISTS (SELECT 1 FROM series s WHERE s.execucao_id = et.id)
      ORDER BY et.data_execucao DESC
      LIMIT 1
    `).get(id, req.user.id);

    if (!ultimaExecucao) {
      return res.json({ existe: false });
    }

    const series = await db.prepare(`
      SELECT
        s.exercicio_id,
        e.nome as exercicio_nome,
        s.peso,
        s.repeticoes,
        s.ordem
      FROM series s
      JOIN exercicios e ON e.id = s.exercicio_id
      WHERE s.execucao_id = ?
      ORDER BY s.ordem
    `).all(ultimaExecucao.id);

    const seriesPorExercicio = {};
    series.forEach(s => {
      if (!seriesPorExercicio[s.exercicio_id]) {
        seriesPorExercicio[s.exercicio_id] = {
          exercicio_id: s.exercicio_id,
          exercicio_nome: s.exercicio_nome,
          series: []
        };
      }
      seriesPorExercicio[s.exercicio_id].series.push({
        peso: s.peso,
        repeticoes: s.repeticoes
      });
    });

    res.json({
      existe: true,
      data: ultimaExecucao.data_execucao,
      volume_total: ultimaExecucao.volume_total,
      series_por_exercicio: Object.values(seriesPorExercicio)
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/treinos/:id/executar", requireAuth, async (req, res) => {
  const { id } = req.params;

  const treino = await db.prepare("SELECT id FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);
  if (!treino) {
    return res.status(404).json({ erro: "Treino não encontrado" });
  }

  const data_execucao = new Date().toISOString();

  try {
    const result = await db.prepare("INSERT INTO execucoes_treino (treino_id, data_execucao, user_id) VALUES (?, ?, ?)").run(id, data_execucao, req.user.id);
    res.json({ execucao_id: result.lastInsertRowid, data_execucao });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/execucoes/:id/series", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { exercicio_id, peso, repeticoes, ordem } = req.body;

  if (exercicio_id == null || peso == null || repeticoes == null || ordem == null) {
    return res.status(400).json({ erro: "Dados incompletos (exercicio_id, peso, repeticoes, ordem)" });
  }

  try {
    const execucao = await db.prepare("SELECT id FROM execucoes_treino WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!execucao) {
      return res.status(404).json({ erro: "Execução não encontrada" });
    }

    await db.prepare("INSERT INTO series (execucao_id, exercicio_id, peso, repeticoes, ordem) VALUES (?, ?, ?, ?, ?)").run(id, exercicio_id, peso, repeticoes, ordem);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/execucoes/:id/finalizar", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const execucao = await db.prepare("SELECT id FROM execucoes_treino WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!execucao) {
      return res.status(404).json({ erro: "Execução não encontrada" });
    }

    const series = await db.prepare(`
      SELECT exercicio_id, peso, repeticoes, ordem
      FROM series
      WHERE execucao_id = ?
      ORDER BY exercicio_id, ordem
    `).all(id);

    if (series.length === 0) {
      return res.status(400).json({ erro: "Execução sem séries" });
    }

    const volumeTotal = calcularVolume1RM(series);

    await db.prepare("UPDATE execucoes_treino SET volume_total = ? WHERE id = ?").run(volumeTotal, id);

    res.json({ sucesso: true, volume_total: volumeTotal });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});


app.get("/api/execucoes/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const execucao = await db.prepare("SELECT * FROM execucoes_treino WHERE id = ? AND user_id = ?").get(id, req.user.id);

  if (!execucao) {
    return res.status(404).json({ erro: "Execução não encontrada" });
  }

  const series = await db.prepare(`
    SELECT s.*, e.nome as exercicio_nome
    FROM series s
    JOIN exercicios e ON e.id = s.exercicio_id
    WHERE s.execucao_id = ?
    ORDER BY s.exercicio_id, s.ordem
  `).all(id);

  res.json({ ...execucao, series });
});

app.get("/api/treinos/:id/progressao", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const execucoes = await db.prepare(`
      SELECT id, data_execucao, volume_total
      FROM execucoes_treino
      WHERE treino_id = ? AND user_id = ? AND volume_total IS NOT NULL
      ORDER BY data_execucao ASC
    `).all(id, req.user.id);

    if (execucoes.length === 0) {
      return res.json({
        base: null,
        ultimo: null,
        atual: null,
        progresso_percentual: null,
        delta_volume: null
      });
    }

    const base = execucoes[0];
    const atual = execucoes[execucoes.length - 1];
    const ultimo = execucoes.length > 1 ? execucoes[execucoes.length - 2] : null;

    let progresso_percentual = null;
    let delta_volume = null;

    if (base.volume_total != null && atual.volume_total != null) {
      delta_volume = atual.volume_total - base.volume_total;
      progresso_percentual = ((delta_volume / base.volume_total) * 100).toFixed(2);
    }

    let delta_reps_por_exercicio = [];

    if (ultimo) {
      const seriesUltimo = await db.prepare(`
        SELECT exercicio_id, SUM(repeticoes) as total_reps
        FROM series
        WHERE execucao_id = ?
        GROUP BY exercicio_id
      `).all(ultimo.id);

      const seriesAtual = await db.prepare(`
        SELECT e.nome as exercicio_nome, s.exercicio_id, SUM(s.repeticoes) as total_reps
        FROM series s
        JOIN exercicios e ON e.id = s.exercicio_id
        WHERE s.execucao_id = ?
        GROUP BY s.exercicio_id
      `).all(atual.id);

      seriesAtual.forEach(atualEx => {
        const ultimoEx = seriesUltimo.find(u => u.exercicio_id === atualEx.exercicio_id);
        if (ultimoEx) {
          const delta = atualEx.total_reps - ultimoEx.total_reps;
          delta_reps_por_exercicio.push({
            exercicio_nome: atualEx.exercicio_nome,
            delta_reps: delta
          });
        }
      });
    }

    res.json({
      base,
      ultimo,
      atual,
      progresso_percentual: parseFloat(progresso_percentual),
      delta_volume,
      delta_reps_por_exercicio
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/* =========================
   EVOLUÇÃO / DASHBOARD
========================= */

app.get("/api/evolucao/dashboard", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const diasTreinados = await db.prepare(`
      SELECT substr(data_execucao, 1, 10) as dia, GROUP_CONCAT(t.nome) as treinos
      FROM execucoes_treino et
      JOIN treinos t ON t.id = et.treino_id
      WHERE et.user_id = ? AND et.volume_total IS NOT NULL
      GROUP BY substr(data_execucao, 1, 10)
      ORDER BY dia ASC
    `).all(userId);

    const volumeHistorico = await db.prepare(`
      SELECT substr(data_execucao, 1, 10) as dia, ROUND(SUM(volume_total), 2) as volume_dia
      FROM execucoes_treino
      WHERE user_id = ? AND volume_total IS NOT NULL
        AND substr(data_execucao, 1, 10) >= date('now', '-90 days')
      GROUP BY substr(data_execucao, 1, 10)
      ORDER BY dia ASC
    `).all(userId);

    const totalRow = await db.prepare(
      `SELECT COUNT(*) as total_treinos FROM execucoes_treino WHERE user_id = ? AND volume_total IS NOT NULL`
    ).get(userId);

    const progressoPorTreino = await db.prepare(`
      SELECT
        treino_id,
        (SELECT volume_total FROM execucoes_treino WHERE treino_id = e.treino_id AND user_id = ? AND volume_total IS NOT NULL ORDER BY data_execucao ASC  LIMIT 1) as vol_base,
        (SELECT volume_total FROM execucoes_treino WHERE treino_id = e.treino_id AND user_id = ? AND volume_total IS NOT NULL ORDER BY data_execucao DESC LIMIT 1) as vol_atual
      FROM execucoes_treino e
      WHERE e.user_id = ? AND e.volume_total IS NOT NULL
      GROUP BY treino_id
      HAVING COUNT(*) >= 2 AND vol_base > 0 AND vol_base != vol_atual
    `).all(userId, userId, userId);

    let progressaoMedia = null;
    if (progressoPorTreino.length > 0) {
      const soma = progressoPorTreino.reduce(
        (acc, p) => acc + ((p.vol_atual - p.vol_base) / p.vol_base * 100), 0
      );
      progressaoMedia = parseFloat((soma / progressoPorTreino.length).toFixed(1));
    }

    const setDias = new Set(diasTreinados.map(d => d.dia));
    let streakAtual = 0;
    let checkDate = new Date();
    const hoje = checkDate.toISOString().split('T')[0];
    if (!setDias.has(hoje)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (!setDias.has(dateStr)) break;
      streakAtual++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    res.json({
      dias_treinados: diasTreinados,
      volume_historico: volumeHistorico,
      streak_atual: streakAtual,
      total_treinos: totalRow?.total_treinos || 0,
      progressao_media: progressaoMedia
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message })
  }
  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor' })
})

/* =========================
   SERVIDOR
========================= */

initDB().then(() => {
  app.listen(3000, () => {
    console.log("🔥 Servidor rodando em http://localhost:3000");
  });
}).catch(err => {
  console.error("❌ Falha ao iniciar banco de dados:", err.message);
  process.exit(1);
});
