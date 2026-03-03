import express from "express";
import db from "../DB/db.js";
import { calcularVolume1RM } from "./logic/ProgressiveLogic.js";
import { sessionMiddleware } from './middleware/session.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({
  origin: "https://tiagogdella.github.io",
  credentials: true
}));
app.use(express.static("docs"));
app.use(sessionMiddleware);
app.use('/api/auth', authRoutes);

/* =========================
   TREINOS (Templates)
========================= */

// Criar novo treino (template)
app.post("/api/treinos", requireAuth, (req, res) => {
  const { nome, exercicios } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({ erro: "Nome do treino é obrigatório" });
  }

  const data_criacao = new Date().toISOString();

  try {
    const result = db.prepare("INSERT INTO treinos (nome, data_criacao, user_id) VALUES (?, ?, ?)").run(nome, data_criacao, req.user.id);
    const treino_id = result.lastInsertRowid;

    // Se forneceu exercícios, adiciona ao treino
    if (exercicios && Array.isArray(exercicios)) {
      exercicios.forEach((ex, index) => {
        // Suporta string ou objeto {nome, tipo}
        const nomeExercicio = typeof ex === 'string' ? ex : ex.nome;
        const tipoExercicio = typeof ex === 'string' ? 'normal' : (ex.tipo || 'normal');

        // Cria exercício se não existir
        let exercicio = db.prepare("SELECT id FROM exercicios WHERE nome = ?").get(nomeExercicio);

        if (!exercicio) {
          const resEx = db.prepare("INSERT INTO exercicios (nome) VALUES (?)").run(nomeExercicio);
          exercicio = { id: resEx.lastInsertRowid };
        }

        // Adiciona ao treino com tipo
        db.prepare("INSERT INTO treino_exercicios (treino_id, exercicio_id, ordem, tipo) VALUES (?, ?, ?, ?)").run(treino_id, exercicio.id, index + 1, tipoExercicio);
      });
    }

    res.json({ id: treino_id, nome, data_criacao });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Listar todos os treinos
app.get("/api/treinos", requireAuth, (req, res) => {
  const treinos = db.prepare(`
    SELECT
      t.id,
      t.nome,
      t.data_criacao,
      COUNT(DISTINCT e.id) as total_execucoes
    FROM treinos t
    LEFT JOIN execucoes_treino e ON e.treino_id = t.id
    WHERE t.user_id = ?
    GROUP BY t.id
    ORDER BY t.id DESC
  `).all(req.user.id);

  res.json(treinos);
});

// Obter detalhes de um treino específico
app.get("/api/treinos/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  const treino = db.prepare("SELECT * FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);

  if (!treino) {
    return res.status(404).json({ erro: "Treino não encontrado" });
  }

  // Busca exercícios do treino
  const exercicios = db.prepare(`
    SELECT e.id, e.nome, te.ordem, te.tipo
    FROM exercicios e
    JOIN treino_exercicios te ON te.exercicio_id = e.id
    WHERE te.treino_id = ?
    ORDER BY te.ordem
  `).all(id);

  res.json({ ...treino, exercicios });
});

// Deletar um treino
app.delete("/api/treinos/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    // Verifica se treino existe e pertence ao usuário
    const treino = db.prepare("SELECT id FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!treino) {
      return res.status(404).json({ erro: "Treino não encontrado" });
    }

    // Deleta o treino (CASCADE vai deletar exercícios e execuções relacionadas)
    db.prepare("DELETE FROM treinos WHERE id = ?").run(id);

    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Adicionar exercício a um treino existente
app.post("/api/treinos/:id/exercicios", requireAuth, (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({ erro: "Nome do exercício é obrigatório" });
  }

  try {
    // Verifica se treino existe e pertence ao usuário
    const treino = db.prepare("SELECT id FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!treino) {
      return res.status(404).json({ erro: "Treino não encontrado" });
    }

    // Cria exercício se não existir
    let exercicio = db.prepare("SELECT id FROM exercicios WHERE nome = ?").get(nome);
    if (!exercicio) {
      const result = db.prepare("INSERT INTO exercicios (nome) VALUES (?)").run(nome);
      exercicio = { id: result.lastInsertRowid };
    }

    // Calcula próxima ordem
    const ultimaOrdem = db.prepare("SELECT MAX(ordem) as max_ordem FROM treino_exercicios WHERE treino_id = ?").get(id);
    const ordem = (ultimaOrdem.max_ordem || 0) + 1;

    // Adiciona ao treino
    db.prepare("INSERT INTO treino_exercicios (treino_id, exercicio_id, ordem) VALUES (?, ?, ?)").run(id, exercicio.id, ordem);

    res.json({ sucesso: true, exercicio_id: exercicio.id, ordem });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/* =========================
   EXECUÇÕES DE TREINO
========================= */

// Buscar dados do último treino executado (para pré-preencher)
app.get("/api/treinos/:id/ultimo", requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    // Busca a última execução do usuário que tenha séries salvas
    const ultimaExecucao = db.prepare(`
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

    // Busca as séries da última execução, agrupadas por exercício
    const series = db.prepare(`
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

    // Agrupa séries por exercício
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

// Iniciar nova execução de um treino
app.post("/api/treinos/:id/executar", requireAuth, (req, res) => {
  const { id } = req.params;

  const treino = db.prepare("SELECT id FROM treinos WHERE id = ? AND user_id = ?").get(id, req.user.id);
  if (!treino) {
    return res.status(404).json({ erro: "Treino não encontrado" });
  }

  const data_execucao = new Date().toISOString();

  try {
    const result = db.prepare("INSERT INTO execucoes_treino (treino_id, data_execucao, user_id) VALUES (?, ?, ?)").run(id, data_execucao, req.user.id);
    res.json({ execucao_id: result.lastInsertRowid, data_execucao });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Adicionar série a uma execução
app.post("/api/execucoes/:id/series", requireAuth, (req, res) => {
  const { id } = req.params;
  const { exercicio_id, peso, repeticoes, ordem } = req.body;

  if (exercicio_id == null || peso == null || repeticoes == null || ordem == null) {
    return res.status(400).json({ erro: "Dados incompletos (exercicio_id, peso, repeticoes, ordem)" });
  }

  try {
    // Verifica se a execução pertence ao usuário
    const execucao = db.prepare("SELECT id FROM execucoes_treino WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!execucao) {
      return res.status(404).json({ erro: "Execução não encontrada" });
    }

    db.prepare("INSERT INTO series (execucao_id, exercicio_id, peso, repeticoes, ordem) VALUES (?, ?, ?, ?, ?)").run(id, exercicio_id, peso, repeticoes, ordem);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Finalizar execução (calcula volume total)
app.post("/api/execucoes/:id/finalizar", requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    // Verifica se a execução pertence ao usuário
    const execucao = db.prepare("SELECT id FROM execucoes_treino WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!execucao) {
      return res.status(404).json({ erro: "Execução não encontrada" });
    }

    // Busca todas as séries da execução agrupadas por exercício
    const series = db.prepare(`
      SELECT exercicio_id, peso, repeticoes, ordem
      FROM series
      WHERE execucao_id = ?
      ORDER BY exercicio_id, ordem
    `).all(id);

    if (series.length === 0) {
      return res.status(400).json({ erro: "Execução sem séries" });
    }

    // Calcula volume total usando a lógica de 1RM
    const volumeTotal = calcularVolume1RM(series);

    // Atualiza execução com volume total
    db.prepare("UPDATE execucoes_treino SET volume_total = ? WHERE id = ?").run(volumeTotal, id);

    res.json({ sucesso: true, volume_total: volumeTotal });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Obter histórico de execuções de um treino
app.get("/api/treinos/:id/historico", requireAuth, (req, res) => {
  const { id } = req.params;

  const execucoes = db.prepare(`
    SELECT
      e.id,
      e.data_execucao,
      e.volume_total,
      COUNT(s.id) as total_series
    FROM execucoes_treino e
    LEFT JOIN series s ON s.execucao_id = e.id
    WHERE e.treino_id = ? AND e.user_id = ?
    GROUP BY e.id
    ORDER BY e.data_execucao DESC
  `).all(id, req.user.id);

  res.json(execucoes);
});

// Obter detalhes de uma execução específica
app.get("/api/execucoes/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  const execucao = db.prepare("SELECT * FROM execucoes_treino WHERE id = ? AND user_id = ?").get(id, req.user.id);

  if (!execucao) {
    return res.status(404).json({ erro: "Execução não encontrada" });
  }

  const series = db.prepare(`
    SELECT s.*, e.nome as exercicio_nome
    FROM series s
    JOIN exercicios e ON e.id = s.exercicio_id
    WHERE s.execucao_id = ?
    ORDER BY s.exercicio_id, s.ordem
  `).all(id);

  res.json({ ...execucao, series });
});

// Obter progressão de um treino (Base → Último → Atual)
app.get("/api/treinos/:id/progressao", requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    // Busca as 3 execuções relevantes: base (primeira), última e penúltima
    const execucoes = db.prepare(`
      SELECT id, data_execucao, volume_total
      FROM execucoes_treino
      WHERE treino_id = ? AND user_id = ?
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

    const base = execucoes[0]; // Primeira execução
    const atual = execucoes[execucoes.length - 1]; // Última execução
    const ultimo = execucoes.length > 1 ? execucoes[execucoes.length - 2] : null; // Penúltima

    // Calcula progressão
    let progresso_percentual = null;
    let delta_volume = null;

    if (base.volume_total != null && atual.volume_total != null) {
      delta_volume = atual.volume_total - base.volume_total;
      progresso_percentual = ((delta_volume / base.volume_total) * 100).toFixed(2);
    }

    // Calcula delta de reps desde o último treino (por exercício)
    let delta_reps_por_exercicio = [];

    if (ultimo) {
      // Busca séries do último e do atual
      const seriesUltimo = db.prepare(`
        SELECT exercicio_id, SUM(repeticoes) as total_reps
        FROM series
        WHERE execucao_id = ?
        GROUP BY exercicio_id
      `).all(ultimo.id);

      const seriesAtual = db.prepare(`
        SELECT e.nome as exercicio_nome, s.exercicio_id, SUM(s.repeticoes) as total_reps
        FROM series s
        JOIN exercicios e ON e.id = s.exercicio_id
        WHERE s.execucao_id = ?
        GROUP BY s.exercicio_id
      `).all(atual.id);

      // Compara reps por exercício
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
   EXERCÍCIOS
========================= */

// Listar todos os exercícios (catálogo compartilhado)
app.get("/api/exercicios", requireAuth, (req, res) => {
  const exercicios = db.prepare("SELECT * FROM exercicios ORDER BY nome").all();
  res.json(exercicios);
});

/* =========================
   SERVIDOR
========================= */

app.listen(3000, () => {
  console.log("🔥 Servidor rodando em http://localhost:3000");
});
