# Sentry setup — final steps

Koden er klar. Integrasjonen er **inaktiv** (no-op) til du setter DSN-ene.
Følg stegene under for å skru den på.

## 1. Opprett Sentry-konto og prosjekter
1. Meld deg på gratis på https://sentry.io/signup
2. Opprett **2 prosjekter**:
   - Plattform `React Native` → navn: `wandermark-mobile` → **kopier DSN**
   - Plattform `Python/FastAPI` → navn: `wandermark-api` → **kopier DSN**
3. Noter organisasjons-slugen din (fra URL: `sentry.io/organizations/{slug}/`)

## 2. Opprett Auth Token (for source-maps ved EAS build)
- Gå til https://sentry.io/settings/account/api/auth-tokens/
- Lag nytt token med scopes: `project:releases`, `project:write`
- Kopier tokenet (vises kun én gang)

## 3. Legg inn verdiene

### Frontend — `/app/frontend/.env`
```
EXPO_PUBLIC_SENTRY_DSN=https://abc@o123.ingest.sentry.io/456
EXPO_PUBLIC_SENTRY_ENVIRONMENT=preview   # eller "production"
```

### Frontend — `/app/frontend/app.json` (plugin-blokken)
Bytt `YOUR_SENTRY_ORG_SLUG` med din organisasjons-slug:
```json
[
  "@sentry/react-native/expo",
  {
    "organization": "dintriv-wandermark",
    "project": "wandermark-mobile",
    "url": "https://sentry.io/"
  }
]
```

### Frontend — EAS secret (for source-maps ved produksjon)
```bash
cd /app/frontend
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>
```

### Backend — Render env vars
Gå til Render → din `wandermark-api` service → Environment:
```
SENTRY_DSN=https://xyz@o123.ingest.sentry.io/789
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=wandermark-api@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

(I preview/staging kan du bruke `SENTRY_ENVIRONMENT=staging` og
`SENTRY_TRACES_SAMPLE_RATE=1.0` for full sampling under testing.)

## 4. Test
- Etter du deployer frontend med nye verdier, trykker på en knapp som
  tvinger en feil (eller midlertidig legg til `throw new Error('sentry test')`
  på en skjerm) — feilen skal dukke opp i Sentry innen 30 sek.
- For backend: deploy med `SENTRY_DSN` satt, så lag en feil via curl. Sentry
  skal vise feilen med user-tag tilknyttet (hvis brukeren var logget inn).

## Hva som automatisk fungerer
- ✅ Sentry blir **inaktiv** når DSN mangler (no-op, ingen ytelseskostnad)
- ✅ `Sentry.wrap()` fanger React-native crashes + touch-breadcrumbs
- ✅ Støyfilter: nettverksbrudd, AbortError, helsesjekker ignoreres
- ✅ Brukerkontekst fra AuthContext (user_id + username + email) tagges på
  hver feil — både frontend og backend
- ✅ Release-navn bygges automatisk fra app.json + EAS build number
- ✅ Metro genererer debug-IDer for source-maps via `getSentryExpoConfig`
- ✅ 10% trace sampling i produksjon → holder seg innenfor gratis-tier
- ✅ Session replay kun ved feil (ingen kvote-sløseri)

## Frie grenser (permanent gratis)
- ~5 000 events/måned inkludert
- Unified Quota: én teller for errors + transactions + replays
- Hvis du overskrider: oppgrader til Team $26/mnd (eller stram sampling)
