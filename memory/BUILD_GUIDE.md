# WanderMark — Build & Deploy Guide

## Oversikt: Hva skjer hvor?

| System | Hva | Hvordan |
|--------|-----|---------|
| **Emergent** | Kodeendringer (frontend + backend) | Agent gjor endringer → "Save to GitHub" |
| **GitHub** | Kilde for alt | Emergent pusher hit. Render og EAS henter herfra |
| **Render** | Backend-hosting (API) | Auto-deploy fra GitHub. DB-migrering krever Shell |
| **MongoDB Atlas** | Produksjons-database | Endres KUN via Render Shell (ikke automatisk) |
| **EAS/TestFlight** | iOS-app bygging | Bygges fra din Mac med `eas build` |

---

## Del 1: Frontend-bygg (EAS → TestFlight)

### Steg-for-steg

**1. Agent bumper buildNumber**
Agenten oppdaterer `buildNumber` i `frontend/app.json` (f.eks. 70 → 71).

**2. Lagre til GitHub**
Bruk "Save to Github"-knappen i Emergent.

**3. Hent endringer og bygg (din Mac)**
Apne Terminal, naviger til `frontend/`-mappen, og kjor:

```bash
git stash && git pull && git stash pop && grep buildNumber app.json && eas build --platform ios --profile production --auto-submit
```

Denne kommandoen:
- Lagrer eventuelle lokale endringer (`git stash`)
- Henter alt fra GitHub (`git pull`)
- Legger tilbake lokale endringer (`git stash pop`)
- Viser buildNumber (verifiser at det er riktig)
- Bygger og sender til TestFlight automatisk

> Bygget tar 15-20 minutter. Du kan lukke terminalen — bygget kjorer i skyen.

### Feilsoking EAS

| Problem | Losning |
|---------|---------|
| `Your local changes would be overwritten` | Kjor `git stash && git pull && git stash pop` |
| `You've already submitted this build` | Be agenten bumpe buildNumber, lagre til GitHub, pull igjen |
| `buildNumber er feil etter pull` | Sjekk at du er pa `main` branch: `git branch` |
| EAS spor om login | `eas login` med Expo-kontoen din |
| `-bash: cd: frontend: No such file or directory` | Du er allerede i frontend-mappen. Fjern `cd frontend` fra kommandoen |

---

## Del 2: Backend-deploy (Render)

### Automatisk (kode-endringer)
Nar du "Save to GitHub" fra Emergent, auto-deployer Render backend-koden automatisk. Du trenger IKKE gjore noe — API-endepunkter, routes, logikk oppdateres av seg selv.

**Vent til deploy er ferdig** i Render Dashboard for du tester i appen.

### Manuelt (database-endringer via Render Shell)
Database-innhold (nye land, landmarks, poeng-fix, achievements-cleanup) oppdateres IKKE automatisk. Agenten ma lage et migrasjonsscript, og du ma kjore det manuelt.

**Nar trengs Render Shell?**
- Nye land eller landemerker lagt til
- Landemerker fjernet eller flyttet mellom kontinenter
- Poeng rekalkulert
- Achievements/badges ryddet opp
- Bilder/koordinater fjernet fra DB

**Slik gjor du det:**
1. Ga til [Render Dashboard](https://dashboard.render.com) → din backend-service
2. Klikk **Shell** tab
3. Du er na i `~/project/src/backend/`
4. Kjor kommandoen agenten gir deg, f.eks:
```bash
cd scripts && python3 mitt_script.py
```

> Agenten lager scriptet, pusher det til GitHub, Render auto-deployer det, og du kjorer det fra Shell.

### Feilsoking Render Shell

| Problem | Losning |
|---------|---------|
| `cd: scripts: No such file or directory` | Du er allerede i scripts. Fjern `cd scripts` |
| Kan ikke lime inn lang tekst | Be agenten lage en .py-fil i stedet. Push til GitHub, deploy, kjor filen |
| `ModuleNotFoundError` | Vent til Render har deployet ferdig, prov igjen |

---

## Del 3: Sjekkliste for agenter

### FOR bygg (agenten gjor dette):
- [ ] Bump buildNumber i `frontend/app.json`
- [ ] Verifiser at alle frontend-endringer er fullfort
- [ ] Verifiser at backend starter uten feil
- [ ] Lag migrasjonsscript hvis DB-endringer er gjort
- [ ] Oppdater PRD.md med hva som er endret

### ETTER "Save to GitHub" (bruker + agent):
- [ ] Vent pa Render auto-deploy (sjekk Render Dashboard)
- [ ] Kjor migrasjonsscript i Render Shell (hvis nodvendig)
- [ ] Verifiser Atlas-data: `python3 -c "..."` i Render Shell
- [ ] Bygg EAS fra lokal Mac (alt-i-ett kommando)
- [ ] Test i TestFlight nar bygget er klart

### VIKTIG for agenter:
- Alle DB-endringer i Emergent preview pavirker KUN lokal MongoDB
- Produksjons-DB (Atlas) endres KUN via Render Shell
- Lag alltid et kjorbart .py-script for DB-migrering (ikke inline-kommandoer)
- Backend-kode auto-deployes, men DB-innhold gjor det IKKE
