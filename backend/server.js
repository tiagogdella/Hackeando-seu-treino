import express from "express";
import db, { initDB } from "../DB/db.js";
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import cors from "cors";
import cookieParser from 'cookie-parser';
import { AppError } from "./errors/AppError.js";
import treinoRoutes from './routes/treinoRoutes.js';
import execucoesRoutes from "./routes/execucaoRoutes.js"

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
   TREINOS 
========================= */
app.use('/api/treinos', treinoRoutes);

/* =========================
   EXECUÇÕES DE TREINO
========================= */
app.use('/api', execucoesRoutes);

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
