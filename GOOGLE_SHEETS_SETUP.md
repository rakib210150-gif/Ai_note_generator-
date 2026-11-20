# Google Sheets Automatic Authentication & Login Tracking Setup

Brain Nest includes built-in two-way synchronization with Google Sheets to automatically record all user registrations and login activities into two structured tabs:

### Sheet 1: `Registered Users`
Stores one unique row per registered user:
- **User ID**
- **Full Name**
- **Email Address**
- **Mobile Number**
- **Country**
- **Registration Date**
- **Last Login**
- **Total Login Count**

### Sheet 2: `Login History`
Appends a record every time any user logs into the platform:
- **User ID**
- **User Name**
- **Email Address**
- **Login Date**
- **Login Time**
- **Login Count**

---

## ⚡ Quick 1-Minute Setup (Recommended: Webhook Method)

1. Create a new Google Spreadsheet at [sheets.new](https://sheets.new) (e.g., named **"Brain Nest Users"**).
2. In the Google Sheets menu, click **Extensions > Apps Script**.
3. Delete any code in the editor, and copy & paste the code from [`backend/google-apps-script.js`](./backend/google-apps-script.js).
4. Click **Deploy > New deployment** (top right blue button).
5. In the modal:
   - Click the gear icon next to "Select type" and choose **Web app**.
   - Description: `Brain Nest Auth Sync`
   - Execute as: **Me** (`your-email@gmail.com`)
   - Who has access: **Anyone**
6. Click **Deploy** and authorize access with your Google account.
7. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycby.../exec`).
8. Add this URL to `backend/.env`:
   ```env
   GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/AKfycby.../exec"
   ```
9. That's it! The script automatically creates and formats the two tabs (`Registered Users` and `Login History`) and syncs in real-time.

---

## 🔒 Alternative Setup: Google Cloud Service Account

If you prefer using a Google Cloud Service Account with Google Sheets API v4:
1. In Google Cloud Console, enable the **Google Sheets API**.
2. Create a Service Account and download its JSON key.
3. Share your Google Spreadsheet with the service account email (as **Editor**).
4. Add the credentials to `backend/.env`:
   ```env
   GOOGLE_SHEET_ID="your_google_spreadsheet_id_here"
   GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...-----END PRIVATE KEY-----\n"
   ```

---

## 🛡️ Reliability & Security
- **Non-blocking & Fault-Tolerant:** All sheet updates run asynchronously. Even if Google's API undergoes temporary downtime or network latency, user registration and login succeed immediately without delay or disruption.
- **Privacy:** User passwords and secret tokens are strictly retained in Supabase and **never** transmitted to Google Sheets.

