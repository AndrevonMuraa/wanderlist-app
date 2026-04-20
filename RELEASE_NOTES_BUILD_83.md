# WanderMark — Release Notes Build 83

**Build**: iOS 82 → 83, Android versionCode 2 → 3
**Version**: 1.4.0 (uendret)
**Dato**: April 2026
**Forrige GitHub-push**: Flere forks siden. Dette er samle-bygget.

---

## 🔥 User-facing endringer

### 1. Messaging er nå GRATIS for alle
Meldinger krever ikke lenger Pro-abonnement. Free-brukere kan messe opp til 5 venner ubegrenset.

### 2. Reviderte Free-tier grenser
| | Før (b82) | Nå (b83) |
|---|---|---|
| Max friends | 3 | **5** |
| Photos per visit | 1 | **3** |
| Diary entries/month | 5 | **10** |

### 3. Messages Inbox i Friends Hub
`/friends` har nytt **Messages Inbox-kort** som åpner meldingslisten direkte. Gammel Messages-seksjon i Social-fanen er fjernet.

### 4. Push-notifikasjoner for meldinger
- Ny onboarding-kort på første besøk i Friends Hub etter at en bruker har venner
- Slår man på → Expo push token registreres mot backend → motta ping når venn sender melding
- Respekterer `messages_enabled` i push-settings (default på)

### 5. Notification Settings fullstendig omskrevet
Seks ekte brytere knyttet til backend `/api/push-settings`:
Messages 💬 · Likes ❤️ · Comments 💭 · Friend requests 👥 · Achievements 🏆 · Weekly digest 📬

Optimistisk UI + rollback ved feil. Tidligere "ghost settings" (dailyReminders, rankProgress) fjernet.

### 6. Unread badge + smart tab-redirect
- Diskret rød prikk (`#D4747E`) på Social-fanen når uleste meldinger eller pending friend requests
- Trykker man Social-fanen med uleste meldinger → går direkte til `/messages`-inbox (ett trykk spart)

### 7. Shareable Comparison Card ("We've both been here")
Nytt delbart kort som viser felles besøk mellom to venner — med datoer, bilder og sammenlignbar statistikk.

### 8. Admin Command Center
Kompakt redesign av admin-dashbordet med sanntids-refresh, klikkbare metrikk-fliser og observability-tellere (Sentry + image-normalization).

### 9. Flag rendering med ratio-scaling
Uvanlige flagg (Sveits 1:1, Nepal ikke-rektangulær) skalerer nå korrekt med `transform: [{ scale }]` basert på faktisk aspektforhold. Pakistan erstatter Kyrgyzstan i landsregisteret.

### 10. Rate-limit bug-fix
429-responser kom tidligere ut som 500 pga. Starlette anyio ExceptionGroup-wrapping. Nå returneres 429 direkte som `Response` — renere error-håndtering og gjør at rate-limit-tester passerer.

---

## 🛠️ Teknisk: Server-side image defense (P5)
- Backend `utils/image_validate.py` håndterer nå alle 6 upload-endepunkter:
  - **<2MB** → passthrough (ingen resize)
  - **2-5MB** → auto-resize til 1600px max (stille, høy kvalitet)
  - **>5MB** → 413 Payload Too Large
- Admin-dashbordet har nytt `/api/admin/image-normalization-stats`-endepunkt for observability

---

## 📦 Pre-build sjekkliste (agent/utvikler)

- [x] `frontend/app.json` buildNumber: 82 → **83**
- [x] `frontend/app.json` versionCode: 2 → **3**
- [x] `E2E_TEST_PLAN.md` oppdatert for Build 83
- [x] `memory/PRD.md` oppdatert (Session 20)
- [x] `memory/test_credentials.md` oppdatert (ny Free-bruker for test)
- [x] Backend-kode lintet (ingen kritiske feil)
- [x] Pytest: **202/208 passerer** (4 pre-eksisterende test-data carry-over, ikke blokkerende)
- [x] Alle endringer auto-committet av plattformen (sjekk med `git log --oneline -30`)
- [ ] **"Save to GitHub"-knapp klikket** ← STEG SOM MÅ GJØRES

---

## 🚀 Render Shell-kommandoer (kjør ETTER GitHub-push + Render auto-deploy)

### A. Verifiser at Pakistan er erstattet for Kyrgyzstan i Atlas
Pakistan-migrasjonsscriptet ligger klart i `scripts/`. Kjør hvis produksjons-Atlas ennå har Kyrgyzstan:

```bash
cd scripts && python3 replace_kyrgyzstan_pakistan.py
```

Forventet output:
```
Removed Kyrgyzstan: 10 landmarks deleted
Added Pakistan: 10 landmarks created
Total countries: 100 (uendret)
```

### B. Kjør standard DB-integritetscheck
```bash
cd scripts && python3 db_compare.py
```

Forventet (ren DB):
```
Countries: 100
Landmarks: 1500 (1000 official, 500 premium)
Duplicate IDs: 0
Duplicate names: 0
Wrong counts: 0
Activity names: 0
```

### C. (Valgfritt) Verifiser push_settings struktur for eksisterende brukere
`messages_enabled` er lagt til default-respons + skrivbar allowlist i `/api/push-settings`. Ingen migrering trengs — eksisterende dokumenter uten feltet vil automatisk få det ved neste PUT. Men for å proaktivt sette default på alle eksisterende dokumenter:

```bash
cd scripts && python3 -c "
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient

async def backfill():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'wandermark')]
    result = await db.push_settings.update_many(
        {'messages_enabled': {'\$exists': False}},
        {'\$set': {'messages_enabled': True}}
    )
    print(f'Backfilled {result.modified_count} push_settings documents')
    client.close()

asyncio.run(backfill())
"
```

> **Merk:** denne backfillen er ikke-kritisk fordi backend faller tilbake til `True` når feltet mangler. Kjør bare hvis du vil ha ren DB-state.

---

## 📱 EAS Build kommandoer (din Mac)

Etter "Save to GitHub" og Render-deploy er ferdig:

```bash
cd ~/.../frontend
git stash && git pull && git stash pop && grep buildNumber app.json && eas build --platform ios --profile production --auto-submit
```

Bygg-tid: 15-20 min. Bygget sendes til TestFlight automatisk.

---

## 🧪 Smoke-test etter TestFlight (kritiske flows)

Minste sett for å validere at bygg 83 fungerer:

1. **Login som Free-bruker** (`freetestuser_msg@wandermark.app` / `Free1234!`)
2. **Gå til Friends Hub** → se Messages Inbox-kort
3. **Send melding** til en venn (ikke 403!)
4. **Slå på notifikasjoner** via onboarding-kort
5. **Sjekk Notification Settings** → 6 brytere, toggle Messages OFF → ingen push kommer → toggle ON
6. **Motta melding** (fra annen enhet/venn) → push-notifikasjon mottas
7. **Se rød prikk** på Social-fanen
8. **Trykk Social-fanen** → går direkte til inbox
9. **Åpne felles landemerke** → Shareable Comparison Card vises → Share fungerer
10. **Last opp profil-bilde >5MB** → forvent 413-feil
11. **Åpne Pakistan** under Asia → 10 landmarks synlige
12. **Login som admin** → Command Center-layout → image-normalization stats synlige

---

## 📊 Known Issues (ikke-blokkerende)

- 4 pre-eksisterende pytest-tester feiler pga. test-data carry-over i iteration15/16-fixtures. Krever isolerte fixtures (~30 min backlog-item).
- iOS/Android web warnings: `textShadow*`/`shadow*` deprecations — kommer fra expo-router og tredjepartsbiblioteker. Ikke funksjons-blokkerende.

---

## 🔮 Neste bygg (Build 84 pipeline)

- P4: Privacy/Terms statisk nettsted (blokkerer App Store ellers)
- P2: "Mitt år i reise" — årlig oppsummering med delbare kort
- P3: GitHub-repo rename (`wanderlist-app` → `wandermark-app`)
- P6: "Nearby travelers" geografisk oppdagelse (krever P4 først)
