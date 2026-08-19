import express from "express";
import { requireAuth } from "../middleware/auth.js";
import * as execucaoController from "../controllers/execucaoController.js";

const router = express.Router();

router.post('/treinos/:id/executar', requireAuth, execucaoController.iniciar);
router.get('/treinos/:id/ultimo', requireAuth, execucaoController.buscarUltimo);
router.get('/treinos/:id/progressao', requireAuth, execucaoController.progressao);
router.post('/execucoes/:id/series', requireAuth, execucaoController.adicionarSerie);
router.post('/execucoes/:id/finalizar', requireAuth, execucaoController.finalizar);
router.get('/execucoes/:id', requireAuth, execucaoController.obterComSeries);

export default router;