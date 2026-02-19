# RevenueCat Setup Guide for WanderMark

## 🎯 Overview
This guide will help you set up RevenueCat for in-app purchases in WanderMark.

---

## Step 1: Create RevenueCat Account

1. Go to [https://app.revenuecat.com/signup](https://app.revenuecat.com/signup)
2. Sign up with your email or Google account
3. Verify your email

---

## Step 2: Create a New Project

1. Click **"Create New Project"**
2. Name it: `WanderMark`
3. Click **"Create Project"**

---

## Step 3: Add Your Apps

### For iOS (App Store Connect)
1. In RevenueCat, go to **Project Settings → Apps**
2. Click **"+ New App"** → Select **"App Store"**
3. Enter your **Bundle ID**: `com.wandermark.app`
4. Enter your **App Store Connect Shared Secret**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Select your app → **App Information** → **App-Specific Shared Secret**
   - Generate and copy the secret
5. Click **"Save"**

### For Android (Google Play)
1. Click **"+ New App"** → Select **"Play Store"**
2. Enter your **Package Name**: `com.wandermark.app`
3. Upload your **Google Play Service Account JSON**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a Service Account with "Pub/Sub Admin" role
   - Download the JSON key file
4. Click **"Save"**

---

## Step 4: Create Products in App Stores

### App Store Connect (iOS)
1. Go to **My Apps** → **WanderMark** → **Subscriptions**
2. Create a **Subscription Group**: `WanderMark Pro`
3. Add subscriptions:
   - **Monthly**: `wandermark_pro_monthly` - $3.99/month
   - **Yearly**: `wandermark_pro_yearly` - $29.99/year

### Google Play Console (Android)
1. Go to **Monetize** → **Products** → **Subscriptions**
2. Create subscriptions:
   - **Monthly**: `wandermark_pro_monthly` - $3.99/month
   - **Yearly**: `wandermark_pro_yearly` - $29.99/year

---

## Step 5: Configure Products in RevenueCat

1. In RevenueCat, go to **Products**
2. Click **"+ New"**
3. Add each product:
   - **Identifier**: `wandermark_pro_monthly`
   - **App Store Product ID**: `wandermark_pro_monthly`
   - **Play Store Product ID**: `wandermark_pro_monthly`
4. Repeat for yearly product

---

## Step 6: Create Entitlements

1. Go to **Entitlements** → **"+ New"**
2. Create entitlement:
   - **Identifier**: `pro`
   - **Description**: `WanderMark Pro Access`
3. Click on the entitlement → **"+ Attach"**
4. Attach both products (monthly and yearly)

---

## Step 7: Create Offerings

1. Go to **Offerings** → **"+ New"**
2. Create offering:
   - **Identifier**: `default`
   - **Description**: `Default offering`
3. Add packages:
   - **Monthly**: Select `wandermark_pro_monthly`
   - **Annual**: Select `wandermark_pro_yearly`

---

## Step 8: Get Your API Keys

1. Go to **Project Settings** → **API Keys**
2. Copy your keys:
   - **iOS Public API Key**: `appl_xxxxxxxxxx`
   - **Android Public API Key**: `goog_xxxxxxxxxx`

---

## Step 9: Add Keys to WanderMark

1. Open `/app/frontend/.env`
2. Add your keys:
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_key_here
```

3. In the app, set `MOCK_PURCHASES = false` in `/app/frontend/utils/purchases.ts`

---

## 🧪 Testing

### Sandbox Testing (iOS)
1. Create a Sandbox Tester in App Store Connect
2. Sign out of App Store on device
3. Make a purchase - it will prompt for Sandbox account

### Testing (Android)
1. Add your email as a License Tester in Play Console
2. Publish to Internal Testing track
3. Test purchases will be free

---

## ✅ Checklist

- [ ] RevenueCat account created
- [ ] Project created in RevenueCat
- [ ] iOS app added with Shared Secret
- [ ] Android app added with Service Account JSON
- [ ] Products created in App Store Connect
- [ ] Products created in Google Play Console
- [ ] Products added to RevenueCat
- [ ] Entitlement "pro" created and products attached
- [ ] Offering "default" created with packages
- [ ] API keys added to .env file
- [ ] MOCK_PURCHASES set to false

---

## 📞 Support

If you have issues:
- RevenueCat Docs: https://docs.revenuecat.com
- RevenueCat Discord: https://discord.gg/revenuecat
