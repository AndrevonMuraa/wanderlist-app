# WanderMark — iOS Build & Deploy Guide

## Steg-for-steg (hver gang)

### 1. Be agenten bumpe buildNumber
Agenten oppdaterer `buildNumber` i `frontend/app.json`.

### 2. Lagre til GitHub
Bruk "Save to Github"-knappen i Emergent.

### 3. Hent endringer lokalt
Kjør dette i `frontend/`-mappen:

```bash
git stash && git pull && git stash pop
```

> Dette håndterer lokale endringer automatisk. Trygt å kjøre hver gang.

### 4. Verifiser buildNumber
```bash
grep buildNumber app.json
```

### 5. Bygg og send til TestFlight
```bash
eas build --platform ios --profile production --auto-submit
```

---

## Alt-i-ett kommando (kopier og lim inn)
```bash
git stash && git pull && git stash pop && grep buildNumber app.json && eas build --platform ios --profile production --auto-submit
```

---

## Feilsøking

| Problem | Løsning |
|---|---|
| `Your local changes would be overwritten` | Kjør `git stash && git pull && git stash pop` |
| `You've already submitted this build` | Be agenten bumpe buildNumber, lagre til GitHub, pull igjen |
| `buildNumber er feil etter pull` | Sjekk at du er på `main` branch: `git branch` |
| EAS spør om login | `eas login` med Expo-kontoen din |
