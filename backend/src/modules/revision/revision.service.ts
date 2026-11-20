import { z } from "zod";
import { geminiService } from "../../lib/gemini";
import { supabaseAdmin } from "../../lib/supabase";
import { walletService } from "../wallet/wallet.service";
import { pricingConfig } from "../../config/env";
import { documentService } from "../documents/documents.service";

export const generateRevisionSchema = z.object({
  subject: z.string().min(1),
  chapter: z.string().min(1),
  contextText: z.string().optional().nullable(),
  fileId: z.string().optional().nullable(),
});

export type GenerateRevisionInput = z.infer<typeof generateRevisionSchema>;

export class RevisionService {
  public async generateRevisionSheet(userId: string, input: GenerateRevisionInput) {
    const coinCost = pricingConfig.revisionSheet;

    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `Rapid Revision Sheet: ${input.subject} - ${input.chapter}`
    );

    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins for revision sheet.");
    }

    try {
      let context = input.contextText || "";
      const isEntire = input.chapter?.toLowerCase().includes("entire") || input.chapter?.toLowerCase().includes("complete syllabus");

      if (!context) {
        const resolved = await documentService.resolveDocumentContext({
          userId,
          fileId: input.fileId,
          subject: input.subject,
          chapter: input.chapter,
        });
        if (resolved.text && resolved.text.length >= 25) {
          context = resolved.text.slice(0, 20000);
        } else if (resolved.insufficientContent) {
          throw new Error(
            `Insufficient study content available in the selected source (${input.subject} - ${input.chapter}) to create a revision sheet.`
          );
        }
      } else {
        if (!isEntire && input.chapter) {
          context = documentService.extractChapterFromText(context, input.chapter);
        }
      }

      const prompt = `You are an elite exam preparation specialist and high-yield revision sheet creator.
STRICT SOURCE & CHAPTER ISOLATION:
Create a condensed, high-retention one-page revision blueprint exclusively for:
- Subject: ${input.subject}
- Chapter: ${input.chapter}

CRITICAL RULES:
1. If source context is provided below, every single key point, formula, mnemonic, and quick question MUST come STRICTLY from the specified chapter (${input.chapter}).
2. Do NOT mention or include content from unrelated chapters or outside subjects.

${context ? `Source context for ${input.chapter}:\n"""\n${context}\n"""` : ""}

Return ONLY a valid JSON object matching this schema:
{
  "keyPoints": ["Bullet 1...", "Bullet 2...", "Bullet 3..."],
  "formulas": ["Equation 1: E = mc^2", "Equation 2: PV = nRT"],
  "memoryAids": ["Mnemonic / Trick 1", "Mnemonic / Trick 2"],
  "quickQuestions": [
    "Q1: Short recall question?",
    "Q2: Formula application question?"
  ]
}`;

      const generated = await geminiService.generateJSON<{
        keyPoints: string[];
        formulas: string[];
        memoryAids: string[];
        quickQuestions: string[];
      }>(prompt);

      const title = `${input.subject} — ${input.chapter} Rapid Revision`;

      const { data: sheet, error } = await supabaseAdmin
        .from("revision_sheets")
        .insert({
          user_id: userId,
          subject: input.subject,
          chapter: input.chapter,
          title,
          key_points: generated.keyPoints,
          formulas: generated.formulas,
          memory_aids: generated.memoryAids,
          quick_questions: generated.quickQuestions,
          coin_cost: coinCost,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to save revision sheet: ${error.message}`);

      return {
        ...sheet,
        coinsRemaining: deduction.newBalance,
      };
    } catch (err) {
      console.error("Revision sheet generation failed, issuing refund:", err);
      await walletService.addCoins(userId, coinCost, "Refund: Failed Revision Sheet");
      throw err;
    }
  }

  public async getUserRevisionSheets(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("revision_sheets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}

export const revisionService = new RevisionService();
