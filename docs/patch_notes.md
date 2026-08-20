# NNAudio Access v1.0.5 — Release Notes

This release extends offline plugin authorization and keeps your license fresh in the background so you do not need to open Access every few weeks.

## Licensing & offline use

- **30-day offline license** — After you authorize in NNAudio Access, plugins stay authorized for 30 days (was 2 weeks)
- **NNAudio License Auto Refresh** — A quiet weekly background refresh renews `license.dat` using your saved session, without opening the Access window
- **Remember Me** — Required for automatic refresh; if you are offline during a weekly run, your current license stays valid until its expiry

## Fixes

- **View Patch Notes** — The update-panel link now opens https://nnaud.io/patch-notes in your system browser (WebView no longer ignores the click)
- **Product patch notes** — Opening patch notes from a product menu opens the notes file when it is available

## How automatic refresh works

1. Open NNAudio Access 1.0.5 once while signed in with Remember Me
2. Access registers **NNAudio License Auto Refresh** in the background
3. About once a week, Access briefly refreshes your license and exits — no UI required
4. Existing plugins pick up the renewed license automatically

---
