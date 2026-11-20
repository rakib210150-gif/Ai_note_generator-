import { z } from "zod";
import { geminiService } from "../../lib/gemini.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { walletService } from "../wallet/wallet.service.js";
import { pricingConfig } from "../../config/env.js";
import { documentService } from "../documents/documents.service.js";

export const tutorMessageSchema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().min(1, "Message cannot be empty"),
  subject: z.string().optional().nullable(),
  academicLevel: z.string().optional().nullable(),
  fileId: z.string().optional().nullable(),
});

export type TutorMessageInput = z.infer<typeof tutorMessageSchema>;

export class TutorService {
  /**
   * Send a question to the AI Tutor, get streaming/full response, and save message history
   */
  public async sendMessage(userId: string, input: TutorMessageInput) {
    const coinCost = pricingConfig.tutorMessage;

    // Deduct coins atomically
    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `AI Tutor Chat: ${input.message.slice(0, 30)}...`
    );

    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins for AI tutor response.");
    }

    try {
      const isUuid = (str?: string | null) => (str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false);
      let conversationId = input.conversationId;

      // Create conversation if new or non-uuid
      if (!conversationId || !isUuid(conversationId)) {
        const { data: conv, error: convError } = await supabaseAdmin
          .from("tutor_conversations")
          .insert({
            user_id: userId,
            title: input.message.slice(0, 40) + "...",
            subject: input.subject || "General Academic",
            academic_level: input.academicLevel || "College / HSC",
          })
          .select()
          .single();

        if (convError || !conv) throw new Error("Failed to initialize conversation");
        conversationId = conv.id;
      }

      // Save user message
      await supabaseAdmin.from("tutor_messages").insert({
        conversation_id: conversationId,
        sender: "user",
        message: input.message,
      });

      // Fetch last 6 messages for context
      const { data: recentHistory } = await supabaseAdmin
        .from("tutor_messages")
        .select("sender, message")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(6);

      const formattedHistory = (recentHistory || [])
        .reverse()
        .map((m) => `${m.sender.toUpperCase()}: ${m.message}`)
        .join("\n");

      // Optional document context (auto-resolves Class 9-10 Physics & Biology)
      let docContext = "";
      const resolved = await documentService.resolveDocumentContext({
        userId,
        fileId: input.fileId,
        subject: input.subject,
        classLevel: input.academicLevel,
      });
      if (resolved.text) {
        docContext = `Reference Study Document Context (${resolved.docName || input.subject}):\n"""\n${resolved.text.slice(0, 5000)}\n"""`;
      }

      const prompt = `You are a supportive, high-clarity academic tutor for Brain Nest.
Help the student solve problems, understand tough concepts, and prepare for exams.
You support both English and Bangla (বাংলা). If the student writes in Bangla or asks for Bangla explanations, provide friendly, grammatically natural Bengali.

${docContext}

Recent Conversation History:
${formattedHistory}

Student's Latest Message:
"${input.message}"

Provide a clear, engaging, step-by-step educational answer. Include bullet points, examples, and formulas where helpful.`;

      const aiReply = await geminiService.generateText(
        prompt,
        "You are Brain Nest AI Academic Tutor, empowering students to achieve top exam scores."
      );

      // Save tutor message
      const { data: tutorMsg, error: tutorError } = await supabaseAdmin
        .from("tutor_messages")
        .insert({
          conversation_id: conversationId,
          sender: "tutor",
          message: aiReply,
        })
        .select()
        .single();

      if (tutorError) throw new Error("Failed to persist tutor reply");

      return {
        conversationId,
        userMessage: input.message,
        tutorReply: aiReply,
        messageId: tutorMsg.id,
        coinsRemaining: deduction.newBalance,
      };
    } catch (err) {
      console.error("Tutor request failed, issuing refund:", err);
      await walletService.addCoins(userId, coinCost, "Refund: Failed Tutor Chat");
      throw err;
    }
  }

  public async getConversations(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("tutor_conversations")
      .select("*, tutor_messages(*)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}

export const tutorService = new TutorService();
