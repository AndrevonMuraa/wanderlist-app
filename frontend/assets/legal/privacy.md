# Privacy Policy

**Last updated:** May 5, 2026
**Effective:** May 5, 2026

WanderMark ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use the WanderMark mobile application and related services (the "Service"). By using WanderMark you consent to this Policy.

If you do not agree, please do not use the Service.

---

## 1. Information We Collect

### 1.1 Account Information
When you register, we collect:
- Email address
- Password (stored only as a bcrypt hash — we never see plaintext)
- Display name and optional profile photo
- Optional bio and home location
- Apple Sign-In identifier and (if shared) email address

### 1.2 Travel & Usage Data
- Landmarks and destinations you mark as visited
- Photos, diary notes, and travel tips you upload
- Points, achievements, ranks, and leaderboard standings
- Friend connections, comments, likes, and direct messages
- Activity feed entries (visits, photos, milestones)
- Bucket-list items
- Year-in-Travel aggregated statistics generated from your visits

### 1.3 Device & Technical Data
- Device type, OS version, app version
- Crash reports and performance traces (via Sentry, when enabled)
- Push notification tokens (via Expo Notifications)
- IP addresses (for security, rate-limiting, and abuse prevention only)

### 1.4 Security & Audit Data
For account safety we additionally store:
- **Failed login attempts and lockout timestamps** — used to throttle brute-force attacks; cleared on successful login or after 24 hours
- **Two-factor authentication (2FA) data** — TOTP secrets and one-time backup codes are encrypted at rest and only stored for accounts that have enrolled (currently mandatory only for super-administrators)
- **Trust signals** — anonymized in-app behavior used to calibrate verification thresholds for the Trusted Traveler program
- **Administrative action logs** — when a moderator acts on your account (warning, suspension, content removal), we record the action, the moderator ID, the IP address from which it was performed, and a timestamp; this exists for accountability and dispute resolution

### 1.5 Subscription Data
If you purchase WanderMark Pro:
- Subscription status and entitlements via RevenueCat
- Apple App Store / Google Play receipt identifiers
- We do **not** see or store your full credit-card or banking information — these are handled by Apple, Google, or RevenueCat directly

### 1.6 Communications
- Support tickets you create, including the full message thread between you and our moderation team
- Moderator messages sent to you and your replies

---

## 2. How We Use Your Information

We use the information we collect to:
- Provide, operate, and maintain the WanderMark Service
- Track your travel progress, achievements, and rank
- Display social features (leaderboards, friend connections, activity feed) according to your privacy settings
- Send transactional emails (account verification, password reset, security alerts) via Resend
- Send push notifications you have opted into via Expo Notifications
- Detect and prevent fraud, abuse, brute-force attacks, and policy violations
- Personalize your experience (Year-in-Travel recap, suggested landmarks)
- Respond to support requests and moderation appeals
- Comply with legal obligations and protect our and others' rights

We do **not** use your data for behavioral advertising. We do **not** sell your personal information.

---

## 3. Information Sharing

We share information only:
- **With other users**, based on your privacy settings (public, friends-only, private)
- **On leaderboards**, where your display name, profile photo, and points may be visible to all users (super-administrators are excluded by design)
- **With service providers** strictly to operate the Service (see §8 below) — each is bound by a Data Processing Agreement
- **For legal reasons** when required by law, court order, or to protect users from imminent harm
- **In a corporate transaction** (merger, acquisition, asset sale) with notice to users

We never sell, rent, or trade your personal information.

---

## 4. Your Privacy Controls & Rights

You have the following controls in-app:
- **Default privacy setting** for new visits (public, friends-only, private)
- **Per-visit visibility override**
- **Comment-permission control** (everyone, friends, no one)
- **Notification preferences** (push, email, in-app)
- **Friend management** (block, unfriend, decline requests)
- **Two-factor authentication** enrollment, disabling, and backup-code regeneration
- **Account deactivation** with a 30-day grace period — log back in within that window to restore; after 30 days, all data is permanently deleted

If you reside in the EEA, UK, or Switzerland, the GDPR grants you these rights:
- **Access** (Art. 15) — request a copy of your data
- **Rectification** (Art. 16) — correct inaccurate data
- **Erasure** (Art. 17) — request deletion of your account and content
- **Restriction** (Art. 18) — limit how we process your data
- **Portability** (Art. 20) — receive your data in a machine-readable format
- **Objection** (Art. 21) — object to specific uses (e.g., profiling)
- **Lodge a complaint** with your local Data Protection Authority

If you reside in California, the CCPA grants substantially equivalent rights, including the right to know, delete, and opt-out of data "sale" (we never sell data, so opt-out is automatic).

To exercise any right, email **support@wandermark.app**. We respond within 30 days.

---

## 5. Data Retention

| Data Type | Retention |
|---|---|
| Account data | Lifetime of the account + 30-day grace period |
| Visits, photos, diary entries | Lifetime of the account; deleted on account deletion |
| Failed login attempts | 24 hours from last attempt |
| Admin action logs | 2 years (for moderation accountability) |
| Trust events | 1 year, then anonymized |
| Support tickets | 3 years (for dispute resolution) |
| Crash reports (Sentry) | 90 days |
| Push notification tokens | Until you uninstall or revoke |

After account deletion, anonymized aggregate statistics (e.g., "users who visited France") may be retained.

---

## 6. Data Storage & Security

- Data is stored on **MongoDB Atlas** servers located in the **European Union (Stockholm, Sweden)**
- Application servers are hosted on **Render.com** (EU region)
- All traffic is encrypted in transit (TLS 1.2+)
- Passwords are hashed with bcrypt; 2FA secrets are encrypted at rest
- Brute-force attempts are throttled by progressive lockout (1 min → 10 min → 1 hour → 24 hours)
- API requests are rate-limited per IP address
- We have an **emergency lockdown switch** that allows administrators to instantly freeze all write operations during a security incident

While we apply industry-standard security measures, no system is 100% secure. We will notify affected users without undue delay if we become aware of a personal data breach.

---

## 7. Camera & Photo Library Access

WanderMark requests camera and photo library permissions to let you:
- Take photos of landmarks you visit
- Choose existing photos from your gallery
- Set a profile picture

Photos are stored on our servers and visible only according to your privacy settings. You can delete any uploaded photo at any time.

---

## 8. Third-Party Service Providers

We use the following processors. Each is contractually bound to protect your data:

| Provider | Purpose | Region |
|---|---|---|
| **Apple Sign In** | Authentication | Apple-managed |
| **RevenueCat** | Subscription management | US |
| **Resend** | Transactional email | EU |
| **Expo Notifications** | Push delivery | US (token relay only) |
| **Sentry** | Crash reporting (when enabled) | EU |
| **MongoDB Atlas** | Database hosting | EU (Stockholm) |
| **Render.com** | Application hosting | EU |
| **Cloudflare** | DDoS protection / CDN | Global |

We do **not** use third-party advertising or analytics SDKs.

---

## 9. Children's Privacy

WanderMark is not intended for children under 13. We do not knowingly collect personal information from anyone under 13. If you believe a child has provided us data, contact **support@wandermark.app** and we will delete it.

---

## 10. International Transfers

If you access WanderMark from outside the EU, your data is still stored in our EU servers. Transfers from the EU to processors in other jurisdictions (e.g., RevenueCat in the US) are protected by Standard Contractual Clauses or equivalent safeguards.

---

## 11. Automated Decision-Making

The Trusted Traveler verification system uses automated signals (photo presence, account age, behavior patterns) to label visits as "verified" or "unverified". This affects whether your points count toward the global leaderboard. You may always request human review by contacting support.

The Year-in-Travel recap is fully automated and uses only your own visit data. It produces no decisions that legally or significantly affect you.

---

## 12. Changes to This Policy

We may update this Policy. Material changes will be announced in-app at least 14 days before they take effect. The "Last updated" date at the top reflects the latest revision. Continued use after the effective date constitutes acceptance.

---

## 13. Contact

WanderMark — Privacy
**Email:** support@wandermark.app

If you are in the EU and we have appointed an EU representative, their contact will be listed here.

---

*This Privacy Policy is provided in English. Translations are for convenience only; the English version controls in case of conflict.*
