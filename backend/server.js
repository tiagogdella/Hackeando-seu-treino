import express from "express";
import { initDB } from "../DB/db.js";
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import cors from "cors";
import cookieParser from 'cookie-parser';
import { AppError } from "./errors/AppError.js";
import treinoRoutes from './routes/treinoRoutes.js';
import execucoesRoutes from "./routes/execucaoRoutes.js";
import evolucaoRoutes from './routes/evolucaoRoutes.js';

const app = express();
app.use(express.json());
app.use(cookieParser())
app.use(cors({
  origin: "https://tiagogdella.github.io",
  credentials: true
}));
app.use(express.static("docs"));
app.use('/api/auth', authRoutes);
app.use('/api/treinos', treinoRoutes);
app.use('/api', execucoesRoutes);
app.use('/api', evolucaoRoutes);

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
