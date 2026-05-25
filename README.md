# 💸 Financial Flow (Budget Tracker)

Financial Flow is a personal finance tracker that helps you manage **expenses**, **income**, and **debts (receivables/payables)** across custom **financial cycles**. The UI is optimized for desktop and mobile, and supports a lightweight PWA install.

## ✨ Features

- **Dashboard**
  - Summary cards and charts for income/expense trends
  - **Recent Expenses** list (defaults to **3 rows** with a **View more** toggle)
  - Category breakdown / quick insights
- **Expenses / Income Ledger**
  - Add, edit, delete transactions
  - Filters: search, type, category, date range
  - **Math input for Amount** (e.g. `1000 + 400 + 400`) with a live preview
- **Debts Manager**
  - Track **Receivables** (owed to you) and **Payables** (you owe)
  - Mark settled/unsettled, edit, delete
  - Math input supported for Amount
- **Financial Cycles (Months)**
  - Start a new cycle, auto-close the previous cycle end date
- **Cloud Sync (AWS Amplify Gen 2)**
  - Cognito authentication (Sign in / Sign up / Email verification)
  - **Forgot password** + reset flow
  - Data stored via AppSync + DynamoDB models
- **PWA basics**
  - Service worker (registered outside localhost)
  - Home Screen icon support for iOS via PNG `apple-touch-icon`

## 🧰 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **UI:** Custom CSS + Lucide icons
- **Backend (optional / cloud):** AWS Amplify Gen 2 (`amplify/`), Cognito Auth, AppSync GraphQL, DynamoDB

## 🗂️ Project Structure

- `src/` – React app
  - `src/App.tsx` – App shell, tabs/navigation, data loading
  - `src/components/` – Dashboard, Transactions, Debts, Auth
  - `src/dbConnector.ts` – Local/Amplify data bridge
  - `src/utils/math.ts` – CSP-safe math expression parser
- `amplify/` – Amplify Gen 2 backend definition
  - `amplify/backend.ts` – Backend entry
  - `amplify/data/resource.ts` – Data models
  - `amplify/auth/resource.ts` – Auth resource
- `public/` – Static assets, manifest, service worker

## 🚀 Getting Started

### ✅ Prerequisites

- Node.js (recommended: current LTS)
- npm

### 📦 Install

```bash
npm install
```

### 🧪 Run (dev)

```bash
npm run dev
```

### 🏗️ Build

```bash
npm run build
```

Notes:

- Build runs `prebuild` which generates PNG icons for PWA/iOS.
- Output goes to `dist/`.

### 👀 Preview production build

```bash
npm run preview
```

## ☁️ AWS Amplify (Cloud Backend)

This project is set up for Amplify Gen 2. The backend definition is in `amplify/`.

### 🧱 Data Models

Defined in `amplify/data/resource.ts`:

- `FinancialMonth` – cycle metadata (name/start/end/active)
- `Expense` – transactions (both EXPENSE and INCOME)
- `Debt` – receivables/payables (with settled flag)

Authorization uses owner-based access (each signed-in user sees their own records).

### 🧪 Run a sandbox backend

From the project root:

```bash
npm run amplify:backend
```

This will provision backend resources in your AWS account and generate/update `amplify_outputs.json`.

### ✅ Use an existing hosted backend (no local backend deploy)

If you already deployed the backend via **Amplify Hosting** (or another CI/CD flow), you do **not** need to run `ampx sandbox` locally.

You only need the environment-specific config file (`amplify_outputs.json`) and to place it at:

- `public/amplify_outputs.json` (not committed)

Ways to get the correct outputs file:

1. **From your hosted site** (if it serves the file)

- Open: `https://<your-hosted-domain>/amplify_outputs.json`
- Save it as `public/amplify_outputs.json`

2. **From Amplify Console build artifacts**

- Amplify Console → Hosting → Build history → select the latest successful build
- Download artifacts and extract `amplify_outputs.json`
- Copy it to `public/amplify_outputs.json`

After that, run:

```bash
npm run dev
```

### 🔧 Link Amplify outputs for local development

If you ran a local sandbox backend (which writes `amplify_outputs.json` in the project root), copy the generated outputs file into `public/` so the app can load it at runtime:

```powershell
npm run amplify:link
```

That command is Windows-friendly and will fail with a clear message if `amplify_outputs.json` is missing or incomplete.

Note: If you are using an existing hosted backend, you typically **do not** run `amplify:link`. Instead, place the hosted environment’s outputs directly at `public/amplify_outputs.json`.

### 🚀 Start local development

```bash
npm run dev
```

### 🔎 How the app detects Amplify

On startup, the app attempts to fetch `public/amplify_outputs.json` (served at `/amplify_outputs.json`).

- If the file exists and contains a valid auth configuration, Amplify is configured (see `src/main.tsx`).
- If the file is missing, the app runs in Local Storage Mode.

If Amplify is not configured, the UI shows instructions for connecting a backend.

## 🧮 Amount “Math Supported” Input

Amount fields accept basic expressions:

- Operators: `+ - * /`
- Parentheses: `( )`
- Decimals: `12.50`
- Unary minus: `-500 + 1000`

The parser is CSP-safe (no `eval`/`new Function`) and lives in `src/utils/math.ts`.

## 📲 PWA / iOS Home Screen Icon

iOS Home Screen icons are most reliable with PNG `apple-touch-icon`.

- Manifest: `public/site.webmanifest`
- iOS icon tag: `index.html`
- PNG generator: `scripts/generate-pwa-icons.mjs`

Generate icons manually:

```bash
npm run generate:icons
```

If you change the logo and iOS still shows the old icon:

- Delete the existing Home Screen shortcut
- Add to Home Screen again (iOS caches icons aggressively)

## 🔐 Security Notes

- Do **not** commit real secrets (AWS access keys, tokens, `.env` files).
- `amplify_outputs.json` contains identifiers/endpoints (Cognito IDs and GraphQL URL). Treat it as environment-specific configuration; it is not an AWS secret key.
- This repo intentionally does **not** commit `amplify_outputs.json` or `public/amplify_outputs.json`.
- The Amplify Console “Data” table is an admin view; values stored in DynamoDB will be visible there to anyone with AWS console access.

## 🛠️ Troubleshooting

### “Invalid math expression” even for simple numbers

The app uses a strict Content Security Policy (CSP) which blocks `eval`/`Function`. Math evaluation is implemented via a parser in `src/utils/math.ts`.

### Amplify configured but app can’t sign in

- Confirm `public/amplify_outputs.json` is present and matches your deployed environment
- Ensure the backend is deployed and Cognito User Pool exists

### iOS “Add to Home Screen” shows no logo

- Ensure `public/apple-touch-icon.png` exists
- Remove old Home Screen icon and re-add

## 📜 Scripts

- `npm run dev` – start dev server
- `npm run amplify:backend` – provision/watch a local Amplify Gen 2 sandbox backend
- `npm run amplify:link` – copy root `amplify_outputs.json` → `public/amplify_outputs.json` (fails if outputs are incomplete)
- `npm run build` – production build (also generates icons)
- `npm run preview` – preview build
- `npm run lint` – lint
- `npm run generate:icons` – generate PNG icons for manifest + iOS

## 🏗️ Amplify Hosting build note

When building in Amplify Hosting, the pipeline deploy step generates `amplify_outputs.json` and the build copies it into `public/amplify_outputs.json` (see `amplify.yml`) so the frontend can configure Amplify at runtime.
