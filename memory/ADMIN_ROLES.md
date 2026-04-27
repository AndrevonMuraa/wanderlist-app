# WanderMark — Admin & Moderator Roles

Dokumentasjon av rolle-systemet i WanderMark. Sist oppdatert: April 2026.

## 🎯 Oversikt

WanderMark har et **3-tier-system**:

| Rolle | DB-verdi | Omtrentlig antall |
|---|---|---|
| **Super Admin** | `role: "admin"` | 1 (utvikleren) |
| **Moderator** | `role: "moderator"` | 0–N (kuratoer betrodd å moderere innhold) |
| **Bruker** | `role: null` eller `"user"` | Alle vanlige brukere |

## 🛡️ Rolle-matrise

### Super Admin (`role="admin"`) — full tilgang

✅ Alt en moderator kan, pluss:
- `POST /api/admin/make-admin/{user_id}` — promotere bruker til Super Admin
- `POST /api/admin/make-moderator/{user_id}` — promotere bruker til Moderator
- `POST /api/admin/demote-to-user/{user_id}` — fjerne admin/mod-rolle
- `POST /api/admin/recalculate-leaderboard-points` — gjenoppbygg ranglisten
- `PUT /api/admin/users/{user_id}/strip-verified` — fjern brukers verifiserte poeng
- `PUT /api/admin/users/{user_id}` med `{ role: ... }` — endre roller
- `GET /api/admin/bug-reports` — se interne bug-rapporter
- `PATCH /api/admin/bug-reports/{report_id}` — markere bug-rapporter ferdig

### Moderator (`role="moderator"`) — innhold + brukere

✅ Tilgang til:
- `GET /api/admin/stats` — dashboard-statistikk
- `GET /api/admin/users` — vise brukerliste
- `PUT /api/admin/users/{user_id}` med `{ is_banned, subscription_tier, ... }` — banne / oppgradere bruker (men IKKE endre `role`)
- `GET /api/admin/reports` — rapporterings-køen
- `PUT /api/admin/reports/{report_id}` — markere rapport som resolved/dismissed (logges automatisk med moderator-id)
- `GET /api/admin/blocks` — se blokk-relasjoner
- `POST /api/admin/notifications/send` — sende push-varsler
- `GET /api/admin/analytics` — appens analytics

❌ Kan IKKE:
- Endre roller (krever Super Admin)
- Recalculere leaderboard
- Strippe verifiserte poeng
- Aksesserer bug-rapporter

### Bruker (default) — null tilgang

❌ Alt over `/api/admin/*` returnerer **403 Forbidden**

## 🔧 Hvordan promotere noen

**Super Admin → kun via direkte DB-redigering** (Render Shell, MongoDB Compass eller via en eksisterende Super Admin's `make-admin`-endepunkt):
```python
# Kun direkte i MongoDB hvis ingen Super Admin finnes ennå
db.users.update_one({"email": "first-admin@example.com"}, {"$set": {"role": "admin"}})
```

**Moderator → bruk admin-panelet:**
1. Logg inn som Super Admin
2. Gå til `/admin/users`
3. Finn brukeren
4. Trykk på "Promote to Moderator"
5. Backend kaller `PUT /api/admin/users/{user_id}` med `{ "role": "moderator" }`

**Demote tilbake til vanlig bruker:**
1. Samme sted i admin-panelet
2. Trykk "Demote to User"
3. Backend setter `role: "user"`

## 🔐 Backend-auth-funksjoner

- `get_current_user(token)` → enhver innlogget bruker
- `get_admin_user(...)` → krever `role in ("admin", "moderator")`
- `get_super_admin_user(...)` → krever `role == "admin"` med beskrivende 403-melding hvis bare moderator

## 📊 Audit-trail

Når en moderator/admin endrer en rapport via `PUT /api/admin/reports/{report_id}`:

```json
{
  "status": "resolved",
  "reviewed_at": "2026-04-27T10:23:54Z",
  "reviewed_by_user_id": "abc123",
  "reviewed_by_name": "Ricky",
  "reviewed_by_role": "admin"
}
```

Disse feltene returneres i `GET /api/admin/reports` og vises i frontend (admin/reports.tsx) under hver rapport.

## 🚨 Sikkerhetshensyn

- **Aldri eksponer Super Admin-promotering i UI** — burde kreve direkte DB-tilgang for å forhindre social engineering
- **Moderatorer har full ban/unban-makt** — pålitelighet er avgjørende ved valg
- **Recalculate-leaderboard er destruktivt** — Super Admin only siden det kan resette hele konkurranse-historikken
- **Strip-verified-points er destruktivt** — Super Admin only siden brukere får fjernet hardt-tjente poeng

## 🛠️ Vedlikehold

- For å se alle Super Admins i DB-en: `db.users.find({"role": "admin"})`
- For å se alle moderators: `db.users.find({"role": "moderator"})`
- Audit-logger lagres i `db.admin_logs` med felt `admin_id`, `admin_name`, `action`, `target_id`, `created_at`
