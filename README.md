# 🍕 Prezzo Pizzeria — Coupon Booklet Tracker

A high-performance, responsive React, TypeScript, and Tailwind CSS web application for tracking coupon booklets, logging sales, managing outlet locations, and recording redemptions at Prezzo Pizzeria.

This application features a hybrid data architecture:
- **Offline / Local Mode**: Fully functional with high performance using client-side browser storage (IndexedDB / LocalStorage).
- **Google Sheets Cloud Sync**: Real-time bidirectional synchronization with a Google Spreadsheet using OAuth 2.0.

---

## 🚀 Quick Setup: Hosting on GitHub Pages

Follow this step-by-step guide to package your application, upload it to GitHub, and run it for free on **GitHub Pages** with automatic builds!

### Step 1: Initialize Git and Create a Repository
If you haven't already, package this codebase into a local git repository:

```bash
# 1. Initialize a new local git repository
git init -b main

# 2. Add all project files
git add .

# 3. Create your initial commit
git commit -m "feat: initial commit of Prezzo Booklet Tracker"
```

### Step 2: Push to GitHub
1. Go to [GitHub](https://github.com) and click **New Repository**.
2. Name your repository (e.g., `prezzo-coupon-tracker`).
3. Set it to **Public** or **Private** (both work with GitHub Pages).
4. Run the following commands in your terminal to link and push your local repository:

```bash
# 1. Add your GitHub repository as remote (Replace with your actual GitHub URL!)
git remote add origin https://github.com/YOUR_USERNAME/prezzo-coupon-tracker.git

# 2. Push your main branch to GitHub
git push -u origin main
```

---

## ⚡ Step 3: Enable Automated GitHub Pages Deployment

We have included a pre-configured **GitHub Actions Workflow** in `.github/workflows/deploy.yml`. When you push to your repository, it will automatically build and deploy your app.

To enable GitHub Pages in your repository settings:
1. Go to your repository on **GitHub**.
2. Click on the **Settings** tab.
3. In the left navigation rail, click on **Pages**.
4. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
5. Push any change (or trigger the workflow manually under the **Actions** tab) to build and deploy your site!
6. Once completed, your site will be live at:
   `https://YOUR_USERNAME.github.io/prezzo-coupon-tracker/`

---

## 🔒 Crucial Configuration: Enable Google Sign-In on GitHub Pages

Because this application uses Firebase Authentication (via Google Sign-In) to securely retrieve Google Sheets access tokens, **you must authorize your GitHub Pages domain in your Firebase project**.

Without this step, clicking "Sign in with Google" or "Authorize" on your hosted site will result in an OAuth security error.

### How to Add your Authorized Domain:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your Firebase Project (e.g., the project connected to this app).
3. In the left menu, go to **Authentication**.
4. Select the **Settings** tab at the top.
5. In the left list under Settings, click on **Authorized domains**.
6. Click the **Add domain** button.
7. Enter your GitHub Pages domain: **`YOUR_USERNAME.github.io`** (Do not include `https://` or subfolders, just the naked domain).
8. Click **Add**.

*Once added, your hosted GitHub Pages site has full, secure permission to execute Google authentication flows!*

---

## 📊 Connecting to Google Sheets

To utilize full cloud sync with your staff roster, outlet directories, and coupon booklets:

1. Create a new Google Spreadsheet or copy an existing one.
2. Ensure you have the following sheets (tabs) in your spreadsheet if you wish to import/export structured tables:
   - `Booklets`
   - `Outlets`
   - `Staff`
   - `Transactions`
3. Get your spreadsheet's unique ID from its URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_IS_HERE/edit`
4. In the app's **Settings (Gear Icon)** tab:
   - Authenticate your Google Account using **Authorize / Refresh via Google Sign-In**.
   - Paste your **Spreadsheet ID** into the Spreadsheet ID input.
   - Click **Connect & Sync**.

---

## 🛠️ Local Development

To run the application locally on your machine for customization:

```bash
# Install package dependencies
npm install

# Start the local development server (Vite)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Project Architecture

```text
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions CI/CD deployment script
├── src/
│   ├── App.tsx             # Main routing and global state manager
│   ├── main.tsx            # React application root mount point
│   ├── index.css           # Global Tailwind CSS and Custom Fonts configuration
│   ├── types.ts            # Shared TypeScript type definitions
│   ├── components/
│   │   ├── Login.tsx       # Auth / staff login interface with Google Auth
│   │   ├── Dashboard.tsx   # Visual statistics and main dashboard charts
│   │   ├── BookletList.tsx # List and filter view of coupon booklets
│   │   ├── AddBookletForm.tsx # Creation form for new booklets
│   │   ├── StaffManager.tsx   # Roster/Staff management view
│   │   ├── OutletManager.tsx  # Outlet/Location management view
│   │   └── SheetSettings.tsx  # Google Sheets setup and sync controls
│   └── lib/
│       ├── auth.ts         # Firebase Auth initialize and Google Auth listeners
│       └── googleSheets.ts # Google Sheets API wrapper (Load / Save / Auto-sync)
├── vite.config.ts          # Vite bundling and asset config
├── package.json            # Node.js manifest & scripts
└── tsconfig.json           # TypeScript compilation presets
```

---

*Made with 💖 for Prezzo Pizzeria.*
