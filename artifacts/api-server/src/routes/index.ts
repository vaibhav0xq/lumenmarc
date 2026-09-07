import { Router, type IRouter } from "express";
import checkRouter from "./check";
import healthRouter from "./health";
import marketRouter from "./market";
import opsRouter from "./ops";
import portfolioRouter from "./portfolio";
import stocksRouter from "./stocks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketRouter);
router.use(stocksRouter);
router.use(checkRouter);
router.use(portfolioRouter);
router.use(opsRouter);

export default router;
