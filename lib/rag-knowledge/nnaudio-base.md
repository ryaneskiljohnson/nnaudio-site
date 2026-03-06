# NNAudio Site and Product Information

## What is nnaud.io?

nnaud.io is the official NNAudio website where you can browse and buy plugins, sample packs, MIDI packs, bundles, and other music production products. You create an account, purchase or redeem products, and use NNAudio Access (our free desktop app) to download and install everything in one place.

## Product Categories

- **Plugin** – AU and VST3 plugins (instruments, audio FX, MIDI FX) for your DAW.
- **Pack** – Sample packs, MIDI packs, loops, presets, templates (downloadable content).
- **Bundle** – Collections of products; some bundles offer one-time (lifetime) or subscription (monthly/annual) options.
- **Application** – NNAudio Access is a free application that manages all your NNAudio products.

Plugins are typically AU and VST3 for major DAWs (Logic, Ableton, FL Studio, Cubase, Studio One, Reaper, Bitwig, etc.). Delivery: Windows EXE, macOS PKG. NNAudio Access runs on macOS and Windows. Check each product page for compatibility (Windows 10+, macOS Mojave 10.14+).

---

## NNAudio Access (Downloads and Installations)

NNAudio Access is our **free desktop app** that lists everything you own, lets you download installers, and install or update plugins and packs in one place.

### How to get NNAudio Access

- Get it from the **NNAudio Access product page** on nnaud.io: `/product/nnaudio-access` (free).
- Or go to **Dashboard → Downloads** (`/downloads`) after logging in to get the installers.

### Installation

- **macOS**: Download the .pkg installer. Universal installer with standalone app and plugins (AU, VST3) for Apple Silicon and Intel. The installer places the app in Applications and plugins in `/Library/Audio/Plug-Ins/` (AU in Components, VST3 in VST3).
- **Windows**: Download the .exe installer. Complete installer for Windows 10/11 including standalone app and plugin formats (VST3). The installer places the app in `C:\Program Files\NNAudio\` and plugins in `C:\Program Files\Common Files\VST3\`.

### Logging in and token storage

- Open NNAudio Access and log in with your **nnaud.io account** (email and password).
- The app gets a Supabase token and stores it so plugins can use it too:
  - **macOS**: Keychain or UserDefaults (shared app group).
  - **Windows**: Registry `HKEY_CURRENT_USER\Software\NNAudio\Access\Token` or `%APPDATA%\NNAudio\access_token.txt`.

### What NNAudio Access does

- Lists all products you have access to (same list as **My Products** on the website).
- Lets you download and run installers for each product; signed download URLs are provided by the server (expire after a short time for security).
- Plugins (VST/AU) read the stored token and call the web API to verify access; no need to log in again inside the DAW.
- If your token expires, open NNAudio Access again to refresh it.

### Updates

- If you own a product, you get current and future versions at no extra charge. The app shows when updates are available; download and run the latest installers when you're ready.

### Redemption in NNAudio Access

- Serial key redemption is **not** implemented inside the NNAudio Access app. Redeem codes on the **website** at nnaud.io/redeem (see Redemption section).

---

## Redemption (Serial Codes)

- Go to **nnaud.io/redeem** (or use the header link **Redeem Products** when logged in).
- You must be **logged in** to redeem.
- Enter your serial code and submit. The system validates the code and grants the product to your account.
- If you already redeemed that code with the same account, you'll see a message that it was already redeemed.
- After redeeming, the product appears under **My Products** (`/my-products`) and in **NNAudio Access**. Use either the website or the app to download and install.

---

## Purchase Options and Billing

### One-time purchases

- Most plugins, packs, and many bundles are **one-time purchase** (including lifetime). Pay once, keep the product forever with current and future updates.

### Subscriptions

- Some bundles offer **monthly or annual subscription**. Recurring access while active; if you cancel, access ends when the period ends. Some bundles offer both lifetime and subscription options—check the product or bundle page.

### Checkout

- Checkout is via Stripe. After payment, you're redirected to `/checkout-success` or `/checkout-canceled`.

### Billing page (Dashboard)

- Go to **Dashboard → Billing** (`/billing`) to:
  - View and manage **payment methods** (add or remove cards).
  - View your **subscriptions**.
  - Click **Manage** on a subscription to open the **Stripe Customer Portal** (cancel subscription, update payment method, view invoices).

---

## Account Management (Logged-in User)

All of the following require logging in. From the header, **My Account** goes to the dashboard.

### Dashboard (`/dashboard`)

- Dashboard home with links to: My Orders, My Products, Getting Started, Downloads, Billing, Support, Settings, Profile.

### My Products (`/my-products`)

- Lists all products you have access to (purchases, redeemed codes, subscription). Use the **Download Now** (or similar) CTA to go to **Downloads** to get NNAudio Access installers and then download/install each product.

### Downloads (`/downloads`)

- **NNAudio Installers**: Download NNAudio Access for macOS (.pkg) or Windows (.exe). All NNAudio products are installed using NNAudio Access. Link to **Getting Started** for step-by-step setup.

### Getting Started (`/getting-started`)

- Interactive guide to set up NNAudio products for your OS and DAW: download and install NNAudio Access, choose installation type (plugin vs standalone), and see install paths.

### Billing (`/billing`)

- Payment methods and subscriptions; **Manage** opens Stripe Customer Portal.

### Support (`/support`)

- Create and manage **support tickets**; reply to tickets; attach files. For help or to report a problem, create a ticket here or email **support@nnaud.io**.

### Settings (`/settings`)

- **Personal info**: First name, last name; email is read-only.
- **Password**: Use **Send Password Reset Email** to reset your password (no in-app "change password" form).
- **Delete account**: In the Danger Zone, type **DELETE** to confirm, then confirm again. This action is **irreversible**; all your data will be permanently deleted. Use this only when you are sure.

### Profile (`/profile`)

- View your profile information.

---

## Public Pages and Navigation

- **Home** – `/`
- **Plugins** – `/plugins`
- **Packs** – `/packs`
- **All Products** – `/products`
- **Bundles** – `/bundles` (list), `/bundles/[slug]` (single bundle)
- **Single product** – `/product/[slug]`
- **Pricing** – `/#pricing`
- **FAQ** – `/#faq`
- **Cart** – `/cart`
- **Checkout** – `/checkout` (products), `/checkout/bundle` (bundle)
- **Redeem** – `/redeem` (must be logged in to redeem)
- **About** – `/about`
- **Patch notes** – `/patch-notes`
- **Privacy Policy** – `/privacy-policy`
- **Terms of Service** – `/terms-of-service`
- **Refund Policy** – `/refund-policy`
- **Contact** – Contact form; you can also email **support@nnaud.io** for help.

---

## FAQ (Frequently Asked Questions)

**What is NNAudio Access and how do I use it?**  
NNAudio Access is our free desktop app that lists everything you own, lets you download installers, and install or update plugins and packs in one place. Get it from the NNAudio Access product page (free) at `/product/nnaudio-access`, install for macOS or Windows, then log in with your nnaud.io account. You can also download installers from My Products on the website at `/dashboard` (then My Products) if you prefer.

**Where do I see my products and how do updates work?**  
Log in and go to Dashboard → My Products (`/my-products`) to see all products linked to your account; the same list appears in NNAudio Access. The app shows when updates are available—download and run the latest installers when you're ready. We don't charge for updates; if you own a product, you get current and future versions.

**I purchased products before the new site and don't see them in my account. What should I do?**  
If you bought before we launched this website, your order may not be linked yet. Log in, then go to Support (`/support`) and create a ticket with the email you used when you purchased and any order or receipt details. We'll attach your past purchases to your account so they appear under My Products and in NNAudio Access.

**What's the difference between subscriptions and one-time purchases?**  
One-time purchases (including lifetime): Pay once, keep the product forever with current and future updates. Most plugins, packs, and many bundles are sold this way. Subscriptions (monthly or annual): Recurring access while active; if you cancel, access ends when the period ends. Some bundles offer both lifetime and subscription options—check the product or bundle page.

**What formats and platforms are supported?**  
Plugins are typically AU and VST3 for major DAWs (Logic, Ableton, FL Studio, Cubase, Studio One, Reaper, Bitwig, etc.). Sample packs and MIDI are downloadable content. NNAudio Access runs on macOS and Windows. Check each product page for details.

**How do I get help or report a problem?**  
Log in, go to Support (`/support`), and create a ticket with your issue. You can also email support@nnaud.io.

---

## Admin and Internal Areas

Admin-only areas (e.g. `/admin`, NFR licenses, resellers, coupons, email campaigns) are for internal use. The bot does not guide users through admin workflows. If someone asks about admin access, direct them to contact support.
