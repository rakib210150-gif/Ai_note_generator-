import { Router, Request, Response, NextFunction } from "express";
import { walletService } from "./wallet.service";
import { requireAuth } from "../../middleware/auth.middleware";
import { sendSuccess, sendError } from "../../utils/response";
import { z } from "zod";

const router = Router();

// GET /api/v1/wallet - Current balance
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const balance = await walletService.getBalance(userId);
    sendSuccess(res, { coins: balance }, "Wallet balance retrieved");
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/wallet/transactions - History
router.get("/transactions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const transactions = await walletService.getTransactions(userId);
    sendSuccess(res, transactions, "Wallet transactions retrieved");
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/wallet/daily-bonus
router.post("/daily-bonus", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await walletService.claimDailyBonus(userId);
    sendSuccess(res, result, result.message);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/wallet/topup - Simulates credit/package topup or connected payment webhook
const topupSchema = z.object({
  amount: z.number().int().positive(),
  packageName: z.string().min(1),
});

router.post("/topup", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount, packageName } = topupSchema.parse(req.body);
    const result = await walletService.addCoins(userId, amount, `Top Up: ${packageName}`);
    sendSuccess(res, result, `Successfully credited ${amount} coins.`);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/wallet/deduct - Deduct coins for downloads, tools, etc.
const deductSchema = z.object({
  amount: z.number().int().positive(),
  action: z.string().min(1),
});

router.post("/deduct", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount, action } = deductSchema.parse(req.body);
    const result = await walletService.deductCoins(userId, amount, action);
    if (!result.success) {
      sendError(res, result.message || "Insufficient coin balance", 400, "INSUFFICIENT_COINS");
      return;
    }
    sendSuccess(res, result, `Successfully deducted ${amount} coins.`);
  } catch (err) {
    next(err);
  }
});

export default router;
