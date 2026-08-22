import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini";
import knowledgeRouter from "./knowledge";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(geminiRouter);
router.use(knowledgeRouter);

export default router;
