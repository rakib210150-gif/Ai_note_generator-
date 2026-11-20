import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

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

  public getCandidateModels(): string[] {
    const configured = this.getModelName();
    const defaults = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    return Array.from(new Set([configured, ...defaults].filter(Boolean)));
  }

  public isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  public async generateText(prompt: string, systemInstruction?: string, maxTokens: number = 4096): Promise<string> {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured on the backend server.");
    }

    const candidateModels = this.getCandidateModels();
    let lastError: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: prompt,
          config: {
            maxOutputTokens: maxTokens,
            ...(systemInstruction ? { systemInstruction } : {}),
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`Gemini generation warning with model ${model} (attempt ${i + 1}/${candidateModels.length}):`, error?.message || error);
        if (i < candidateModels.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }

    console.error("All Gemini candidate models failed:", lastError);
    throw new Error(`AI generation failed: ${lastError?.message || "Unknown error"}`);
  }

  public async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured on the backend server.");
    }

    const base64Data = buffer.toString("base64");
    const candidateModels = this.getCandidateModels();
    let lastError: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: "Extract and return all textual content, questions, definitions, formulas, and paragraphs verbatim from this document. Do not summarize; return the complete extracted text as it appears.",
                },
              ],
            },
          ],
        });

        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`Gemini OCR warning with model ${model}:`, error?.message || error);
        if (i < candidateModels.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }

    throw new Error(`OCR extraction failed: ${lastError?.message || "Unknown error"}`);
  }

  public async generateJSON<T>(prompt: string, systemInstruction?: string, responseSchema?: any): Promise<T> {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured on the backend server.");
    }

    let raw = "";
    const candidateModels = this.getCandidateModels();

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      try {
        const config: any = {
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
        };
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseSchema) config.responseSchema = responseSchema;

        const response = await this.client.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        if (response.text) {
          raw = response.text;
          break;
        }
      } catch (apiErr: any) {
        console.warn(`Gemini JSON attempt warning with model ${model}:`, apiErr?.message || apiErr);
        if (i === candidateModels.length - 1) {
          try {
            raw = await this.generateText(prompt, systemInstruction, 4096);
          } catch {
            throw apiErr;
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
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
