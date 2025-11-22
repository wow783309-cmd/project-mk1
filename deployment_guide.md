# Sharing & Deployment Guide

## 1. Sharing Source Code (For Team Members)
To share the code so your team can edit or run it:
1.  **Use GitHub (Recommended)**:
    *   Initialize git: `git init`
    *   Create a repository on GitHub.
    *   Push code:
        ```bash
        git add .
        git commit -m "Initial commit"
        git branch -M main
        git remote add origin <your-repo-url>
        git push -u origin main
        ```
    *   Your team can then `git clone` the repo.

## 2. Sharing Running App (Temporary / Demo)
If you just want to show them the app running on your computer without deploying:
*   **Ngrok** (Easiest):
    1.  Install ngrok: `brew install ngrok` (or download from website).
    2.  Start your app: `npm run dev` (Frontend) and `npm run server` (Backend).
    3.  Expose ports:
        *   `ngrok http 5173` (Share this URL for the UI).
        *   *Note: Since frontend talks to backend on localhost, this might have CORS issues unless configured.*
*   **Local Network**:
    *   If you are on the same WiFi, they can access via your IP: `http://<your-ip>:5173`.
    *   Run vite with host: `npx vite --host`.

## 3. Cheap Hosting Options (Permanent)
Since your app uses **Node.js + Socket.IO + SQLite**, you need a host that supports long-running processes (not just static files).

### Option A: Render / Railway (Easiest PaaS)
*   **Pros**: Very easy to set up, free tiers available.
*   **Cons**: Free tiers spin down (sleep) after inactivity.
*   **SQLite Warning**: On many PaaS (like Render Free), the filesystem is "ephemeral" (wiped on restart). You would lose your database.
    *   **Solution**: Use **Railway** (starts at $5/mo) with a Volume for SQLite, or switch to a free PostgreSQL database (Railway/Render offer this).

### Option B: VPS (DigitalOcean / Hetzner) - Recommended for Production
*   **Cost**: ~$4-5/month.
*   **Pros**: Full control. You can keep using SQLite exactly as is. No "sleeping".
*   **Setup**:
    1.  Buy a "Droplet" (Ubuntu).
    2.  SSH in.
    3.  Install Node.js.
    4.  Clone your repo.
    5.  Run with `pm2` (Process Manager) to keep it alive.

### Recommendation for "Cheap & Simple"
**Railway** is likely the easiest middle ground. It handles the deployment for you, and for ~$5/mo you get a solid service. If you want **Free**, you can use **Render** but you MUST switch from SQLite to a hosted PostgreSQL database (which adds complexity) or accept that data might be lost on restarts (not good for a clinic).

**For a Clinic (Reliability > Free):**
I recommend a **$5/mo DigitalOcean Droplet**. It's cheap, reliable, and you don't need to change your code (SQLite works perfectly).
