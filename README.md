# 💼 MudraDesk

A premium, localized invoice and quotation generator. Designed for speed, security, and simplicity.

## 🚀 Deployment Guide (Vercel + Supabase)

Follow these steps to deploy **MudraDesk** to the cloud.

### 1. Supabase Setup (Database)
Create a new project on [Supabase](https://supabase.com/) and run the following SQL in the **SQL Editor** to create the required `users` table:

```sql
-- Create users table for MudraDesk
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_name TEXT NOT NULL,
    business_address TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    gst_number TEXT,
    gst_verified INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by TEXT
);

-- Note: Bills and templates are stored in the user's browser localStorage.
```

### 2. Vercel Deployment
1.  Push this repository to **GitHub**.
2.  Import the project into [Vercel](https://vercel.com/).
3.  Add the following **Environment Variables** in the Vercel project settings:
    -   `SECRET_KEY`: A long random string (e.g., `mudra-desk-prod-key-123`)
    -   `SUPABASE_URL`: Your Supabase Project URL
    -   `SUPABASE_ANON_KEY`: Your Supabase Anon Key
    -   `SUPABASE_SERVICE_KEY`: Your Supabase Service Role Key (Required for admin operations)
    -   `SESSION_LIFETIME_DAYS`: `36500` (for "forever" session persistence)
4.  Deploy! Vercel will automatically use the `vercel.json` and `requirements.txt` at the root.

---

## 🛠 Project Structure
-   `backend/`: Flask API, Auth, and Supabase client logic.
-   `frontend/`: HTML templates and Static assets (CSS/JS).
-   `uploads/`: Temporary storage for business logos/stamps.

---

## 💻 Local Development
If you wish to run the app locally:
1.  Create a virtual environment: `python3 -m venv venv`
2.  Activate it: `source venv/bin/activate` or `venv\Scripts\activate`
3.  Install dependencies: `pip install -r requirements.txt`
4.  Add your Supabase credentials to a `.env` file.
5.  Run: `python3 backend/app.py`

---

## 📄 License
Privately held. MudraDesk Branding & Assets © 2024.
