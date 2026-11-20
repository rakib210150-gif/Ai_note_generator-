import { GoogleGenAI } from "@google/genai";
import { env } from "../backend/src/config/env";

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== "your-gemini-api-key") {
      try {
        this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        this.isConfigured = true;
      } catch (err) {
        console.warn("Failed to initialize GoogleGenAI client:", err);
      }
    }
  }

  public getModelName(): string {
    return env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  }

  public isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  public async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured on the backend server.");
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.getModelName(),
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          ...(systemInstruction ? { systemInstruction } : {}),
        },
      });

      return response.text || "";
    } catch (error: any) {
      console.error("Gemini API invocation error:", error);
      throw new Error(`AI generation failed: ${error?.message || "Unknown error"}`);
    }
  }

  public async generateJSON<T>(prompt: string, systemInstruction?: string, responseSchema?: any): Promise<T> {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured on the backend server.");
    }

    let raw = "";
    try {
      // First attempt: Request strict application/json output mode with optional schema
      const config: any = {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      };
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseSchema) config.responseSchema = responseSchema;

      const response = await this.client.models.generateContent({
        model: this.getModelName(),
        contents: prompt,
        config,
      });

      raw = response.text || "";
    } catch (apiErr) {
      // Fallback: standard generateText if responseMimeType is unsupported
      console.warn("Retrying generateJSON with text generation mode:", apiErr);
      raw = await this.generateText(prompt, systemInstruction);
    }

    try {
      let clean = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/g, "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      // Auto-repair common missing key typos or stray characters before keys (e.g. V"options" -> "options", or bare `2,` -> `"correctIndex": 2,`)
      clean = clean
        .replace(/[a-zA-Z0-9_\u0980-\u09FF]+"options"\s*:/g, '"options":')
        .replace(/[a-zA-Z0-9_\u0980-\u09FF]+"question"\s*:/g, '"question":')
        .replace(/[a-zA-Z0-9_\u0980-\u09FF]+"correctIndex"\s*:/g, '"correctIndex":')
        .replace(/[a-zA-Z0-9_\u0980-\u09FF]+"explanation"\s*:/g, '"explanation":')
        .replace(/,\s*:\s*\[/g, ',\n    "options": [')
        .replace(/^\s*:\s*\[/gm, '    "options": [')
        .replace(/,\s*([a-zA-Z0-9_]+)\s*:\s*\[/g, ',\n    "options": [')
        .replace(/,\s*([0-3])\s*,/g, ',\n    "correctIndex": $1,')
        .replace(/^\s*([0-3])\s*,/gm, '    "correctIndex": $1,');

      try {
        return JSON.parse(clean) as T;
      } catch {
        const firstArr = clean.indexOf("[");
        const lastArr = clean.lastIndexOf("]");
        const firstObj = clean.indexOf("{");
        const lastObj = clean.lastIndexOf("}");

        if (firstArr !== -1 && lastArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
          return JSON.parse(clean.slice(firstArr, lastArr + 1)) as T;
        } else if (firstObj !== -1 && lastObj !== -1) {
          return JSON.parse(clean.slice(firstObj, lastObj + 1)) as T;
        }
        throw new Error("No JSON boundaries found");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini output as JSON. Raw output was:", raw);
      throw new Error("Failed to parse AI structured response.");
    }
  }
}

export const geminiService = new GeminiService();
