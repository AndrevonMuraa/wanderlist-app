# WanderMark Trust Center

Static legal documents for the WanderMark iOS app, required for App Store Review Guideline compliance (5.1.1 Privacy, 3.1.2 Subscriptions).

## Files

| File | Purpose | Guideline |
|---|---|---|
| `privacy.md` | Privacy Policy — GDPR/CCPA compliant, covers all data types collected (account, travel, device, 2FA secrets, admin logs, subscription, communications) | Apple 5.1.1, GDPR Art. 13 |
| `terms.md` | Terms of Service — EULA, subscription auto-renewal, App Store attribution, Norwegian governing law with mandatory-consumer carve-out, DSA appeals | Apple 3.1.2 + Schedule 2 of Apple Dev Agreement |

## Governing Law
- **Jurisdiction:** Norway (Oslo District Court)
- **Consumer carve-out:** EU/EEA/UK/Swiss consumers retain all mandatory statutory rights under local law
- **EU ODR platform** link included per EU Reg. 524/2013

## Deployment (P1)
Deploy as plain HTML/Markdown to a static host with public URLs:
- `https://wandermark.app/privacy` → `privacy.md`
- `https://wandermark.app/terms` → `terms.md`

Recommended hosts: Vercel, Cloudflare Pages, or GitHub Pages. No authentication — App Store reviewers and users must be able to load them anonymously.

## Linking in-app
Both URLs must be surfaced inside the app:
1. **Registration screen** — required checkbox "I agree to Terms & Privacy"
2. **Settings → Legal** — always-available links
3. **Pro purchase screen** — subscription disclosure ("Auto-renewing. See Terms.")
4. **App Store listing metadata** — Privacy URL + EULA URL fields

## Maintenance
- Bump `Last updated` + `Effective` dates when content changes
- Announce material changes in-app at least 14 days before effective date
- Keep the English text as the authoritative version
