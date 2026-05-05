// AUTO-GENERATED from /app/trust-center/ — regenerate with scripts/sync-legal.sh
// Bundled fallback used when the live Trust Center URL is unreachable.

export const BUNDLED_PRIVACY_MD = `# Privacy Policy

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
`;

export const BUNDLED_TERMS_MD = `# Terms of Service

**Last updated:** May 5, 2026
**Effective:** May 5, 2026

Welcome to WanderMark. These Terms of Service ("Terms") form a binding agreement between you ("you", "User") and WanderMark ("WanderMark", "we", "our", "us") governing your access to and use of the WanderMark mobile application, website, and related services (collectively, the "Service").

**By creating an account, signing in, or otherwise using the Service, you confirm that you have read, understood, and accepted these Terms and our Privacy Policy. If you do not agree, do not use the Service.**

---

## 1. Eligibility

You must be at least **13 years old** to use WanderMark. If you are between 13 and the age of majority in your country, you must have your parent's or legal guardian's permission. By using the Service you represent that you meet these requirements and that you are not barred from using the Service under applicable law.

---

## 2. Your Account

### 2.1 Registration
You create an account with an email and password, or through Apple Sign-In. You agree to provide accurate, current, and complete information and to keep it updated.

### 2.2 Account Security
You are responsible for safeguarding your password and any activity under your account. We strongly recommend enabling **two-factor authentication (2FA)** for additional security. Notify us immediately at **support@wandermark.app** if you suspect unauthorized access.

### 2.3 One Account Per Person
Each person may hold only one active account. Creating multiple accounts to manipulate leaderboards, evade moderation, or abuse free-tier limits is prohibited and may result in permanent termination.

### 2.4 Account Deactivation & Deletion
You may deactivate your account from the in-app settings. Deactivated accounts enter a **30-day grace period** during which you can restore them by signing back in. After 30 days, all data is permanently deleted as described in the Privacy Policy.

---

## 3. License to Use the Service

Subject to your compliance with these Terms, WanderMark grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to download, install, and use the Service for your personal, non-commercial enjoyment on devices you own or control.

This license does **not** grant you any right to:
- Copy, modify, reverse-engineer, decompile, or disassemble the Service (except where such restriction is prohibited by law)
- Rent, lease, lend, sell, redistribute, or sublicense any part of the Service
- Access the Service to build a competing product or scrape our data
- Use automated tools (bots, scripts, crawlers) without prior written permission
- Remove or alter proprietary notices, branding, or watermarks

---

## 4. User Content

### 4.1 What Counts as User Content
"User Content" means everything you upload, post, submit, or create on the Service, including visit entries, photos, diary notes, travel tips, comments, messages, profile information, and bucket-list items.

### 4.2 You Own Your Content
You retain all ownership rights in your User Content.

### 4.3 License You Grant Us
By posting User Content, you grant WanderMark a **worldwide, non-exclusive, royalty-free, transferable, sublicensable license** to host, store, reproduce, modify (for formatting), create derivative works (for thumbnails, feed layouts, Year-in-Travel recaps, and aggregate statistics), publicly display, and distribute your User Content, **solely for the purpose of operating, promoting, and improving the Service**. This license ends when you delete the content or your account, except for:
- Backup copies retained for a reasonable time
- Content others have legitimately re-shared (e.g., in feeds they saved)
- Anonymized aggregate data

### 4.4 Your Representations
You represent and warrant that:
- You own or have all necessary rights to your User Content
- Your content does not infringe any third party's intellectual property, privacy, or other rights
- Your content complies with §5 (Prohibited Conduct) below

### 4.5 Feedback
If you send us suggestions or feedback, you grant us a perpetual, irrevocable, royalty-free license to use it without obligation to you.

---

## 5. Prohibited Conduct

You agree **not** to:
- Post content that is unlawful, defamatory, obscene, sexually explicit, hateful, harassing, threatening, or that promotes violence or discrimination
- Impersonate any person or entity, or misrepresent your affiliation
- Upload false visit data, stolen photos, GPS-spoofed locations, or otherwise manipulate points and leaderboards
- Attempt to circumvent the Trusted Traveler verification system, brute-force lockouts, rate limits, or the emergency lockdown switch
- Probe, scan, or test the vulnerability of the Service or breach any security measures
- Introduce malware, viruses, or any other malicious code
- Harvest, scrape, or collect information about other users
- Use the Service to send spam, phishing, or unsolicited commercial messages
- Interfere with any other user's enjoyment of the Service
- Violate any applicable law or regulation

We reserve the right to investigate suspected violations. Consequences include warnings, content removal, point adjustments, account suspension, permanent termination, and — where appropriate — referral to law enforcement.

---

## 6. Moderation & Enforcement

### 6.1 Moderator Actions
Our moderation team may, at its discretion and without prior notice, take any of the following actions when content or behavior violates these Terms:
- Send you an in-app warning
- Remove or hide content
- Reduce or revoke points
- Revoke "verified" status on specific visits
- Temporarily suspend your account
- Permanently terminate your account

### 6.2 Accountability
Every moderation action is logged (moderator ID, timestamp, IP address, reason) for accountability.

### 6.3 Appeals
If you believe a moderation decision was wrong, you may appeal by emailing **support@wandermark.app** within 30 days. We aim to respond within 14 days. EU residents retain their rights under the Digital Services Act (DSA) to out-of-court dispute settlement.

### 6.4 Reporting Violations
You can report content or users directly in-app. We review every report.

---

## 7. WanderMark Pro (Subscriptions)

### 7.1 Nature of the Subscription
WanderMark Pro is an optional paid subscription unlocking premium features (e.g., unlimited bucket list items, advanced statistics, exclusive achievements, extended Year-in-Travel insights). The current feature set is described in-app and may evolve.

### 7.2 Billing
Subscriptions are sold **via the Apple App Store or Google Play Store** and billed through your Apple ID or Google account. **We do not process payment ourselves.** Current prices and billing frequency are shown in-app before purchase.

### 7.3 Auto-Renewal
Subscriptions renew automatically at the end of each period at the then-current price unless canceled at least **24 hours before** the renewal date. Manage or cancel subscriptions in your Apple ID or Google account settings — not inside WanderMark.

### 7.4 Free Trials
If we offer a free trial, it converts automatically to a paid subscription unless canceled before the trial ends. Only one free trial per Apple ID / Google account.

### 7.5 Refunds
Refund requests must be made directly to Apple or Google under their respective refund policies. We have no ability to process refunds on their behalf.

Nothing in this section limits your statutory refund and withdrawal rights under mandatory consumer law (see §14).

### 7.6 Price Changes
We may change subscription prices. Changes apply to renewals after a notice of at least 30 days and, where required, after your express acceptance.

### 7.7 Pro Features Remain Subject to These Terms
A paid subscription does not entitle you to violate these Terms. Violations may result in suspension without refund (except where mandatory consumer law requires otherwise).

---

## 8. Points, Ranks & Leaderboards

The points, ranks, verified status, and leaderboard standings in WanderMark have **no monetary value** and cannot be redeemed, transferred, or sold. We may adjust, recalculate, or reset points at any time — for example, after a data-integrity audit, to reflect moderation actions, or when correcting bugs. We endeavor to announce significant leaderboard resets in advance.

The Trusted Traveler verification labels visits as "verified" or "unverified" based on automated signals (see Privacy Policy §11). You may request human review.

---

## 9. Intellectual Property — Ours

The Service and all content we provide (software, design, text, graphics, logos, trademarks including "WanderMark", landmark metadata, achievement artwork) are owned by WanderMark or our licensors and are protected by copyright, trademark, and other laws. Except for the limited license in §3, no rights are granted to you.

---

## 10. Third-Party Services

The Service integrates with third parties (Apple Sign-In, RevenueCat, Resend, Expo, Sentry, MongoDB Atlas, Render, Cloudflare). Their use is governed by their own terms and privacy policies. We are not responsible for their acts, omissions, or availability.

Links inside WanderMark to third-party websites or resources are provided for convenience. We do not endorse them and are not responsible for their content.

---

## 11. Apple App Store — Additional Terms

These terms apply if you downloaded WanderMark from the Apple App Store:

- These Terms are between you and WanderMark only — **not with Apple**. Apple is not responsible for the Service or its content.
- The license in §3 is limited to use on Apple-branded devices you own or control, as permitted by the **Apple Media Services Terms and Conditions**.
- Apple has no obligation to provide maintenance or support.
- If the Service fails to conform to any applicable warranty, you may notify Apple; Apple's sole warranty obligation is to refund the purchase price (if any).
- Claims relating to product liability, failure to conform, or consumer-law violations are our responsibility, not Apple's.
- Third-party IP infringement claims are our responsibility, not Apple's.
- Apple and its subsidiaries are **third-party beneficiaries** of these Terms and have the right to enforce them against you.
- You represent that you are not located in a country subject to a U.S. Government embargo or listed on any U.S. Government list of prohibited or restricted parties.

---

## 12. Disclaimers

THE SERVICE IS PROVIDED **"AS IS" AND "AS AVAILABLE"**, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY.

We do not warrant that:
- The Service will be uninterrupted, timely, secure, or error-free
- Any content, including landmark information or travel tips, is accurate or complete
- Defects will be corrected
- The Service is free of viruses or malicious code

**Travel Risk.** WanderMark is an experiential travel-tracking app. You remain solely responsible for your own safety, legal compliance, visas, insurance, and risk assessment when visiting any location. Do not rely on the Service for emergency information, real-time safety advisories, or navigation.

Nothing in this section excludes liability for fraud, gross negligence, personal injury caused by our negligence, or any other liability that cannot be excluded by law.

---

## 13. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW:

- **No indirect damages.** We are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, goodwill, or business opportunities, even if we were advised of the possibility.
- **Cap on direct damages.** Our total aggregate liability arising from or related to the Service is limited to the **greater of (a) the amount you paid us in the 12 months before the event giving rise to liability, or (b) 50 EUR**.

This limitation does not apply to liability that cannot be excluded or limited under applicable mandatory law, including liability for fraud, willful misconduct, gross negligence, or personal injury caused by our negligence. Consumers retain all non-waivable statutory rights.

---

## 14. Mandatory Consumer Rights

If you are a consumer residing in the European Economic Area, the United Kingdom, Switzerland, or another jurisdiction with mandatory consumer-protection laws, nothing in these Terms limits the rights granted to you by those laws. Where these Terms conflict with such mandatory rights, the mandatory rights prevail. This includes, where applicable:

- The right of withdrawal within 14 days of a digital-content purchase (unless you expressly waived it before the subscription started to stream or download content)
- Statutory warranties and guarantees of conformity
- Your local court's jurisdiction as required by the Brussels I Regulation (EU 1215/2012) or equivalent rules

---

## 15. Indemnity

You agree to defend, indemnify, and hold harmless WanderMark, its affiliates, officers, employees, and agents from any claim, demand, loss, liability, damage, or expense (including reasonable attorneys' fees) arising out of: (a) your User Content; (b) your use or misuse of the Service; (c) your violation of these Terms; or (d) your violation of any law or third-party right. This section does not apply to the extent prohibited by applicable consumer law.

---

## 16. Termination

### 16.1 Termination by You
You may stop using the Service and delete your account at any time.

### 16.2 Termination by Us
We may suspend or terminate your access, remove content, or terminate these Terms at any time, with or without notice, if:
- You breach these Terms
- We are required to do so by law or court order
- Continued provision becomes commercially unreasonable
- We discontinue the Service

### 16.3 Effect of Termination
Sections 4.3 (license you grant), 9 (our IP), 12 (disclaimers), 13 (limitation of liability), 15 (indemnity), 17 (governing law), and any other provisions that by their nature should survive, survive termination.

---

## 17. Governing Law & Venue

### 17.1 Governing Law
These Terms and any dispute arising from them are governed by the **laws of Norway**, excluding its conflict-of-law rules and excluding the United Nations Convention on Contracts for the International Sale of Goods (CISG).

### 17.2 Venue
The **Oslo District Court (Oslo tingrett)** shall be the exclusive venue for all disputes, except where mandatory law grants consumers the right to sue or be sued in their country of residence.

### 17.3 EU Online Dispute Resolution
If you are an EU consumer, you may use the European Commission's Online Dispute Resolution platform: https://ec.europa.eu/consumers/odr

---

## 18. Changes to These Terms

We may amend these Terms from time to time. Material changes will be announced in-app at least **14 days** before they take effect. Continued use after the effective date constitutes acceptance. If you disagree, your sole remedy is to stop using the Service and delete your account before the changes take effect.

---

## 19. Miscellaneous

- **Entire Agreement.** These Terms and the Privacy Policy are the entire agreement between you and us regarding the Service and supersede any prior agreements.
- **Severability.** If any provision is held unenforceable, the remaining provisions remain in effect.
- **No Waiver.** Our failure to enforce a right is not a waiver of that right.
- **Assignment.** You may not assign or transfer these Terms. We may assign them to an affiliate or in a corporate transaction.
- **No Agency.** Nothing creates a partnership, joint venture, agency, or employment relationship.
- **Force Majeure.** We are not liable for delays or failures caused by events beyond our reasonable control.
- **Notices.** We may send notices via email, in-app message, or by posting in the Service. You must keep your email address current.
- **Language.** These Terms are provided in English. Translations are for convenience only; the English version controls.

---

## 20. Contact

WanderMark — Legal
**Email:** support@wandermark.app

---

*By using WanderMark, you acknowledge that you have read these Terms, understood them, and agree to be bound by them.*
`;
