# WanderMark — Shutdown / avviklingssjekkliste

> Opprettet juni 2026. Rekkefølgen er viktig: backup → stopp kostnader → slett → kanseller abonnementer.
> Ikke slett noe før steg 1 er fullført.

## Tjenester i bruk (komplett liste)

| Tjeneste | Rolle | Kostnad | Hastegrad |
|---|---|---|---|
| Apple Developer Program | iOS-distribusjon, TestFlight | ~$99/år, auto-fornyes | **HØY** — sjekk fornyelsesdato |
| Namecheap | domenet `wandermark.app` | årlig, auto-fornyes | **HØY** — skru av auto-renew |
| Render | backend `api.wandermark.app` | månedlig | **HØY** — løpende kostnad |
| MongoDB Atlas | produksjonsdatabase | månedlig (evt. free tier) | **HØY** — løpende kostnad |
| Emergent | utviklingsplattform | abonnement | MIDDELS |
| Cloudflare | DNS + evt. Pages (Trust Center) | gratis-plan | LAV |
| Expo / EAS | iOS-builds | gratis-plan (betalt ved høy build-bruk) | LAV |
| Sentry | crash reporting | gratis-plan | LAV |
| RevenueCat | abonnementshåndtering | gratis under $2.5k MTR | LAV |
| Resend | transaksjons-e-post | gratis-plan | LAV |
| GitHub | kode | gratis for private repos | INGEN |

## Steg 1 — Backup (gjør ALT dette før du sletter noe)

- [ ] Push siste kode via «Save to Github» i Emergent
- [ ] Klon repoet lokalt og verifiser at det bygger: `git clone ... && cd frontend && yarn install`
- [ ] Kopier alle miljøvariabler/secrets fra Render → lagre i passordhvelv (de er IKKE i git)
- [ ] Kopier `SENTRY_DSN`, RevenueCat-nøkler, Resend API-nøkkel
- [ ] Dump produksjonsdatabasen fra Render Shell:
      `mongodump --uri="$MONGO_URL" --archive=/tmp/wandermark.archive --gzip`
      last ned filen før du sletter tjenesten
- [ ] Ta vare på `/app/trust-center/privacy.md` + `terms.md` (juridisk dokumentasjon du kan trenge senere)
- [ ] Skjermbilder av App Store Connect-metadata hvis du vil kunne gjenopprette oppføringen

## Steg 2 — Stopp løpende kostnader (rask effekt)

- [ ] **Namecheap**: Domain List → `wandermark.app` → Manage → skru av **Auto-Renew**
- [ ] **Apple Developer**: developer.apple.com → Account → Membership → skru av automatisk fornyelse.
      Gjør dette MINST 30 dager før fornyelsesdato, ellers belastes du for et helt nytt år.
- [ ] **Render**: Dashboard → `wandermark-api` → Settings → Suspend (eller Delete)
- [ ] **MongoDB Atlas**: slett clusteret (etter at dumpen i steg 1 er lastet ned)
- [ ] **Emergent**: Re-publish → «Take app offline» → Shutdown (gir pro-rata kredittrefusjon)

## Steg 3 — Juridisk/brukerdata (før du sletter databasen)

- [ ] Sjekk hvor mange **reelle** brukere som finnes i prod (utenom `_seed_source: e2e` og testkontoene)
- [ ] Har appen reelle brukere: send avviklingsvarsel på e-post og gi dem mulighet til dataeksport
      (privacy.md lover dette — GDPR art. 15/17)
- [ ] Slett brukerdata permanent når varslingsfristen er ute
- [ ] Har appen aldri hatt reelle brukere: ingen varslingsplikt, men dokumenter det for egen del

## Steg 4 — Slett prosjekter/tjenester

- [ ] **Apple**: TestFlight → fjern builds. Appen er aldri publisert i App Store, så ingen
      kunder må varsles og ingen abonnementer må avvikles.
- [ ] **Expo**: expo.dev → project settings → Delete project
- [ ] **Sentry**: slett `aarum/wandermark-frontend` + `aarum/wandermark-api`
- [ ] **RevenueCat**: slett prosjektet
- [ ] **Resend**: slett API-nøkler + evt. verifisert domene
- [ ] **Cloudflare**: fjern DNS-records (`api.wandermark.app`), slett Pages-prosjekt, fjern sonen
- [ ] **Emergent**: Settings → Danger Zone → Delete Project (permanent)
- [ ] **GitHub**: behold repoet (gratis) — slett bare hvis du er helt sikker

## Steg 5 — Abonnementer

- [ ] **Emergent**: Profil → Manage plan → Cancel subscription.
      Månedlige kreditter utløper ved periodeslutt (ingen refusjon). Top-up-kreditter og
      Universal Key-saldo blir liggende på kontoen for alltid.
- [ ] Sjekk kortutskrift 1–2 måneder etter avvikling for å fange opp glemte trekk

## Ikke glem

- **Rekkefølge på DNS**: fjern Cloudflare-records FØR du sletter Render-tjenesten, ellers peker
  `api.wandermark.app` mot ingenting og gir stygge feil hvis noen har appen installert.
- **Apple-fornyelse** er den største enkeltkostnaden og den enkleste å glemme.
- **Namecheap gir ingen refusjon** for gjenstående domeneperiode — auto-renew av er nok.
- Vil du kunne gjenoppta prosjektet senere: behold GitHub-repoet + databasedumpen + domenet.
  Alt annet kan gjenskapes på en ettermiddag.
