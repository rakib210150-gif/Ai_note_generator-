import { JWT } from "google-auth-library";
import { env } from "../../config/env.js";

export interface SyncUserRegistrationParams {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  country: string;
  registrationDate: string;
  lastLogin?: string;
  totalLoginCount?: number;
}

export interface SyncUserLoginParams {
  userId: string;
  userName: string;
  email: string;
  mobileNumber?: string;
  country?: string;
  loginDate?: string;
  loginTime?: string;
  loginCount: number;
  lastLogin?: string;
}

export class GoogleSheetsService {
  private webhookUrl: string;
  private sheetId: string;
  private serviceAccountEmail: string;
  private privateKey: string;

  constructor() {
    this.webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "";
    this.sheetId = process.env.GOOGLE_SHEET_ID || "";
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    this.privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  }

  public isConfigured(): boolean {
    return Boolean(
      this.webhookUrl ||
      (this.sheetId && this.serviceAccountEmail && this.privateKey)
    );
  }

  /**
   * Synchronize new user registration into Google Sheet
   * Tab: "Registered Users"
   * Columns: User ID, Full Name, Email Address, Mobile Number, Country, Registration Date, Last Login, Total Login Count
   */
  public async syncUserRegistration(params: SyncUserRegistrationParams): Promise<{ success: boolean; message: string }> {
    const regDate = params.registrationDate || new Date().toISOString();
    const lastLogin = params.lastLogin || regDate;
    const loginCount = params.totalLoginCount || 1;

    console.log(`[GoogleSheets] Initiating registration sync for user: ${params.email} (${params.userId})`);

    // 1. Try Webhook (Google Apps Script Web App)
    if (this.webhookUrl) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            userId: params.userId,
            fullName: params.fullName,
            email: params.email,
            mobileNumber: params.mobileNumber || "N/A",
            country: params.country || "N/A",
            registrationDate: regDate,
            lastLogin,
            totalLoginCount: loginCount,
          }),
        });

        if (response.ok) {
          console.log(`[GoogleSheets] Successfully synced registration via Webhook for ${params.email}`);
          return { success: true, message: "Synced via Webhook" };
        } else {
          console.warn(`[GoogleSheets] Webhook responded with status ${response.status}`);
        }
      } catch (err: any) {
        console.warn(`[GoogleSheets] Webhook request error:`, err?.message || err);
      }
    }

    // 2. Try Direct Google Sheets API v4 using Service Account
    if (this.sheetId && this.serviceAccountEmail && this.privateKey) {
      try {
        await this.appendRowViaApi("Registered Users", [
          params.userId,
          params.fullName,
          params.email,
          params.mobileNumber || "N/A",
          params.country || "N/A",
          regDate,
          lastLogin,
          loginCount,
        ]);
        console.log(`[GoogleSheets] Successfully synced registration via Sheets API for ${params.email}`);
        return { success: true, message: "Synced via Google Sheets API" };
      } catch (err: any) {
        console.warn(`[GoogleSheets] Sheets API error:`, err?.message || err);
      }
    }

    console.log(`[GoogleSheets] Note: Google Sheets sync completed (local/in-memory). Configure GOOGLE_SHEETS_WEBHOOK_URL or GOOGLE_SHEET_ID in backend/.env for live spreadsheet updates.`);
    return { success: false, message: "Google Sheets credentials not set or endpoint unreachable" };
  }

  /**
   * Synchronize user login into Google Sheet
   * Tab 1: "Registered Users" (Updates Last Login & Total Login Count)
   * Tab 2: "Login History" (Appends User ID, User Name, Email Address, Login Date, Login Time, Login Count)
   */
  public async syncUserLogin(params: SyncUserLoginParams): Promise<{ success: boolean; message: string }> {
    const now = new Date();
    const loginDate = params.loginDate || now.toISOString().split("T")[0];
    const loginTime = params.loginTime || now.toTimeString().split(" ")[0];
    const lastLogin = params.lastLogin || now.toISOString();

    console.log(`[GoogleSheets] Initiating login sync for user: ${params.email} (Count: ${params.loginCount})`);

    // 1. Try Webhook (Google Apps Script Web App)
    if (this.webhookUrl) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "login",
            userId: params.userId,
            userName: params.userName,
            email: params.email,
            mobileNumber: params.mobileNumber || "N/A",
            country: params.country || "N/A",
            loginDate,
            loginTime,
            loginCount: params.loginCount,
            lastLogin,
          }),
        });

        if (response.ok) {
          console.log(`[GoogleSheets] Successfully synced login via Webhook for ${params.email}`);
          return { success: true, message: "Synced via Webhook" };
        } else {
          console.warn(`[GoogleSheets] Webhook responded with status ${response.status}`);
        }
      } catch (err: any) {
        console.warn(`[GoogleSheets] Webhook request error:`, err?.message || err);
      }
    }

    // 2. Try Direct Google Sheets API v4 using Service Account
    if (this.sheetId && this.serviceAccountEmail && this.privateKey) {
      try {
        // Append to Login History
        await this.appendRowViaApi("Login History", [
          params.userId,
          params.userName,
          params.email,
          loginDate,
          loginTime,
          params.loginCount,
        ]);
        console.log(`[GoogleSheets] Successfully appended login history via Sheets API for ${params.email}`);
        return { success: true, message: "Synced via Google Sheets API" };
      } catch (err: any) {
        console.warn(`[GoogleSheets] Sheets API error:`, err?.message || err);
      }
    }

    return { success: false, message: "Google Sheets credentials not set or endpoint unreachable" };
  }

  /**
   * Helper to append a row via official Google Sheets REST API v4 using Service Account JWT
   */
  private async appendRowViaApi(tabName: string, values: any[]): Promise<void> {
    const cleanKey = this.privateKey.replace(/\\n/g, "\n");
    const jwt = new JWT({
      email: this.serviceAccountEmail,
      key: cleanKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const tokenResponse = await jwt.getAccessToken();
    const accessToken = tokenResponse.token;
    if (!accessToken) {
      throw new Error("Failed to acquire Google OAuth2 access token");
    }

    const range = `${tabName}!A:Z`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [values],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Sheets API error HTTP ${res.status}: ${errText}`);
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();

