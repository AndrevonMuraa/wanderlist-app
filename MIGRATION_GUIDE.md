# WanderMark — Migrering til Produksjons-Hosting

## Oversikt
Denne guiden tar deg gjennom oppsett av permanent hosting for WanderMark backend.
Etter dette vil appen din fungere 24/7, uavhengig av Emergent.

**Du trenger:**
- MongoDB Atlas (gratis) — database
- Render.com ($7/mnd) — backend-server
- Din eksisterende GitHub-konto

**Tidsestimat:** ~30 minutter

---

## STEG 1: Sett opp MongoDB Atlas (Database)

### 1.1 Opprett konto
1. Gå til **https://www.mongodb.com/cloud/atlas/register**
2. Registrer deg (bruk gjerne "Sign up with Google" for enkelhet)
3. Velg **FREE / M0** tier (512 MB, gratis for alltid)

### 1.2 Opprett database-cluster
1. Etter innlogging, klikk **"Build a Database"**
2. Velg **M0 FREE** (Shared)
3. Velg cloud provider: **AWS**
4. Velg region: **eu-west-1 (Ireland)** (nærmest Norge)
5. Cluster name: `wandermark-cluster` (eller la det stå som default)
6. Klikk **"Create Deployment"**

### 1.3 Sett opp database-bruker
1. Du vil bli bedt om å lage en database-bruker
2. Authentication Method: **Password**
3. Username: `wandermark_admin`
4. Password: Lag et sterkt passord (SKRIV DET NED!)
5. Klikk **"Create Database User"**

### 1.4 Sett opp nettverkstilgang
1. Under "Where would you like to connect from?", velg **"Allow Access from Anywhere"**
   - IP Address: `0.0.0.0/0`
   - Beskrivelse: `Allow all (for Render.com)`
2. Klikk **"Add IP Address"**

### 1.5 Hent connection string
1. Klikk **"Choose a connection method"**
2. Velg **"Drivers"**
3. Driver: Python, Version: 3.12 or later
4. Kopier connection string. Den ser slik ut:
   ```
   mongodb+srv://wandermark_admin:<password>@wandermark-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Bytt ut `<password>`** med passordet du lagde i steg 1.3
6. **Legg til database-navn** på slutten: Bytt `/?retryWrites` med `/wandermark?retryWrites`
   
   Endelig URL:
   ```
   mongodb+srv://wandermark_admin:DITT_PASSORD@wandermark-cluster.xxxxx.mongodb.net/wandermark?retryWrites=true&w=majority
   ```

**LAGRE DENNE URL-EN — du trenger den i neste steg!**

---

## STEG 2: Sett opp Render.com (Backend-server)

### 2.1 Opprett konto
1. Gå til **https://render.com**
2. Klikk **"Get Started for Free"**
3. Velg **"Sign in with GitHub"** (enklest!)
4. Gi Render tilgang til din GitHub-konto

### 2.2 Opprett ny Web Service
1. Fra Render Dashboard, klikk **"New +"** → **"Web Service"**
2. Velg **"Build and deploy from a Git repository"**
3. Koble til ditt GitHub-repo: **wanderlist-app** (eller wandermark-app)
4. Konfigurer tjenesten:

| Innstilling | Verdi |
|-------------|-------|
| Name | `wandermark-api` |
| Region | `Frankfurt (EU Central)` |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| Instance Type | **Starter ($7/month)** |

### 2.3 Legg til miljøvariabler
Under **"Environment Variables"** i Render, legg til disse:

| Key | Value |
|-----|-------|
| `MONGO_URL` | Din MongoDB Atlas connection string fra Steg 1.5 |
| `DB_NAME` | `wandermark` |
| `JWT_SECRET_KEY` | Lag en lang, tilfeldig streng (f.eks. `wm_prod_abc123xyz789...`) |
| `RESEND_API_KEY` | `re_ihJPJCNY_KjMVVM8yhiPc86FqMu7iLG8t` |
| `SENDER_EMAIL` | `noreply@wandermark.app` |
| `PYTHON_VERSION` | `3.11.0` |

### 2.4 Deploy
1. Klikk **"Create Web Service"**
2. Render vil automatisk bygge og deploye backend-en
3. Vent til status viser **"Live"** (tar 2-5 minutter)
4. Du får en URL som: `https://wandermark-api.onrender.com`

### 2.5 Verifiser at backend kjører
Åpne denne URL-en i nettleseren (bytt ut med din faktiske URL):
```
https://wandermark-api.onrender.com/api/auth/login
```
Du bør se: `{"detail":"Method Not Allowed"}` — det betyr at serveren kjører!

---

## STEG 3: Oppdater appen til å bruke ny backend

### 3.1 Oppdater config.ts
I filen `frontend/utils/config.ts`, oppdater URL-en:
```typescript
const PRODUCTION_BACKEND_URL = 'https://wandermark-api.onrender.com';
```
(Bruk din faktiske Render-URL)

### 3.2 Seed database med landmarks
Databasen er tom — du må fylle den med landmarks-data.
Fortell meg når Render er oppe, så hjelper jeg deg med dette.

### 3.3 Opprett test-bruker
Etter seeding, opprett en bruker via appen eller via API.

### 3.4 Bygg ny EAS-build
```bash
cd frontend
eas build --platform ios --profile production
eas submit --platform ios --latest
```

---

## STEG 4: Sett opp custom domene (valgfritt, anbefalt)

Du kan peke `api.wandermark.app` til Render i stedet for å bruke `wandermark-api.onrender.com`:

1. I Render Dashboard → din web service → **Settings** → **Custom Domains**
2. Legg til: `api.wandermark.app`
3. I Cloudflare DNS, legg til en **CNAME**-record:
   - Name: `api`
   - Target: `wandermark-api.onrender.com`
   - Proxy: OFF (grå sky, ikke oransje)
4. Vent på SSL-sertifikat (automatisk via Render)
5. Oppdater `config.ts` til å bruke `https://api.wandermark.app`

---

## Oppsummering av månedlige kostnader

| Tjeneste | Kostnad |
|----------|---------|
| MongoDB Atlas M0 | $0 |
| Render.com Starter | $7/mnd |
| Namecheap domene | ~$1/mnd |
| Cloudflare | $0 |
| Resend Free | $0 |
| **Total** | **~$8/mnd** |

---

## Viktige notater
- MongoDB Atlas M0 har 512 MB lagring — mer enn nok for tusenvis av brukere
- Render Starter har 512 MB RAM — bra for en app i denne størrelsen
- Du kan oppgradere begge etter behov (MongoDB M2=$9/mnd, Render Standard=$25/mnd)
- Render deployer automatisk når du pusher til GitHub
- JWT_SECRET_KEY MÅ være den samme for alltid — ellers logges alle brukere ut
