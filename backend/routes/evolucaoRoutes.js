import express from "express";
import { requireAuth } from "../middleware/auth.js";
import * as evolucaoController from "../controllers/evolucaoController.js";

const router = express.Router();

router.get('/evolucao/dashboard', requireAuth, evolucaoController.dashboard);

export default router;
