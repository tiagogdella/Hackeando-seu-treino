import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as treinoController from '../controllers/treinoController.js';

const router = express.Router()

router.get('/', requireAuth, treinoController.listar)
router.post('/', requireAuth, treinoController.criar)
router.get('/:id', requireAuth, treinoController.obter)
router.patch('/:id', requireAuth, treinoController.atualizarNome)
router.patch('/:id/ativo', requireAuth, treinoController.atualizarAtivo)
router.delete('/:id', requireAuth, treinoController.excluir)
router.post('/:id/exercicios', requireAuth, treinoController.adicionarExercicio)

export default router;