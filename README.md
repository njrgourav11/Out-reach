# 🌐 US Outreach Tool

Find US businesses → Extract emails → AI cold emails → Send via Gmail

**No credit card. No Google Maps key. 100% free data via OpenStreetMap.**

---

## 🆓 Data Source

This app uses **OpenStreetMap + Overpass API** — completely free, no account needed, no API key required.

| Feature | Old (Google Maps) | New (OpenStreetMap) |
|---------|-------------------|----------------------|
| API Key | Required + credit card | ❌ Not needed |
| Cost | $0–$200/mo credit | Free forever |
| US Coverage | Excellent | Very good (major cities) |
| Ratings | ✅ | ❌ (not available) |
| Phone/Website | ✅ | ✅ (when listed by owner) |

---

## 🚀 Quick Setup (4 steps)

### Step 1 — Get your API keys

**Groq API (FREE)**
1. Go to https://console.groq.com
2. Sign up → API Keys → Create key → copy it

**Gmail App Password**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Search "App passwords" → Create one for "Mail"
4. Copy the 16-character password

---

### Step 2 — Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:
```
GROQ_API_KEY=gsk_...
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
YOUR_NAME=Gourav
YOUR_BRAND=Gourav.blog
YOUR_PORTFOLIO=https://gourav.blog
YOUR_SERVICES=website development, web apps, UI/UX design
```

---

### Step 3 — Install and run backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at: http://localhost:5000

---

### Step 4 — Install and run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## 🔧 How to use

1. **Search** → Enter niche (e.g. `dentist`) + city (e.g. `Austin TX`) → Click Search
2. **Find Emails** → Click "Find All Emails" to scrape emails from business websites
3. **Retry Failed** → If some had no email, click "Retry Failed" to try again
4. **Generate** → Click "AI Generate All Emails" for Groq-powered cold emails
5. **Review** → Click "Preview & Send" on any lead to review/edit before sending
6. **Send** → Click Send Email → done!
7. **Export** → Click "Export CSV" to download all leads as a spreadsheet

---

## 📁 Project Structure

```
us-outreach/
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── search.js         # Business search + email enrichment
│   │   │   ├── leads.js          # CRUD + CSV export
│   │   │   └── email.js          # Generate + send emails
│   │   └── services/
│   │       ├── osmPlaces.js      # ✅ OpenStreetMap + Overpass API
│   │       ├── emailExtractor.js # Website scraper for emails
│   │       ├── groqEmailGen.js   # AI email generator (Groq LLaMA)
│   │       └── mailer.js         # Gmail SMTP sender
│   └── .env.example
│
└── frontend/
    └── src/
        ├── App.jsx               # Main dashboard
        ├── api.js                # API service layer
        └── components/
            ├── StatsBar.jsx
            ├── LeadCard.jsx      # Now has Retry Email button
            └── EmailModal.jsx
```

---

## ⚠️ Notes

- OSM data quality varies — large cities (Austin, Miami, NYC) have great coverage
- Without Gmail config → emails send in **mock mode** (logged to console only)
- Data is **in-memory** — restarts clear leads. Add PostgreSQL + Prisma for persistence.
- Overpass API has rate limits — don't fire bulk searches in parallel (app handles this)
- The `puppeteer` package has been removed (was unused) — install is faster now

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/search | Search businesses (OSM) |
| POST | /api/search/enrich/:id | Find email for one lead |
| POST | /api/search/enrich-all | Find emails (body: `{retryFailed: true}` to retry) |
| GET | /api/leads | Get all leads |
| GET | /api/leads/export.csv | Download leads as CSV |
| PATCH | /api/leads/:id | Update lead |
| DELETE | /api/leads/:id | Delete lead |
| POST | /api/email/generate/:id | Generate AI email |
| POST | /api/email/generate-bulk | Generate for all eligible |
| POST | /api/email/send/:id | Send email |
| GET | /api/email/logs | View sent emails |
| GET | /api/email/verify | Test Gmail config |

---

Built with ❤️ — Powered by OpenStreetMap & AI
