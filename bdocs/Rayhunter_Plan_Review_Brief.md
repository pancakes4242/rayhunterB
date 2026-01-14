# Plan Review Brief
## Rayhunter Browser Notification Feature

**Prepared for:** Plan Reviewer  
**Date:** January 2026

---

## One-Sentence Summary

Add browser notifications to an open-source IMSI catcher detector's web UI so users get alerts without needing a cellular data plan.

---

## The Problem

Rayhunter detects cell-site simulators (surveillance devices) and runs on a $20 mobile hotspot. Currently, push notifications require a cellular plan (~$10/month via ntfy). The owner wants alerts without ongoing costs — just using the local WiFi connection between their phone and the device.

---

## The Proposed Solution

Add Web Notifications API support to the existing Svelte frontend. When the user's phone is connected to the device's WiFi with the browser open, they receive audio/visual alerts on detection.

**What it is:** JavaScript/TypeScript changes to the web UI only.

**What it is not:** No backend changes, no firmware changes, no system modifications.

---

## Key Constraints in the Plan

| Constraint | Rationale |
|------------|-----------|
| Only modify `daemon/web/` directory | Device can brick if firmware is corrupted; frontend-only changes are safe |
| No Rust code changes | Backend is out of scope; keeps risk near zero |
| Discovery-first methodology | Claude Code must understand the codebase before writing code, not guess |
| Match existing code style | Potential upstream contribution; maintainer-friendly |

---

## Priority Stack (Ranked)

1. **Don't brick the device** — Hard boundary
2. **Don't break existing features** — Purely additive
3. **Working notifications over local WiFi** — Core deliverable
4. **Maximize reliability within browser limits** — Best effort
5. **Simplicity and elegance** — Maintainable code

---

## Known Limitations (Acknowledged in Plan)

- Browser notifications don't work reliably when phone screen is off
- iOS Safari has significant restrictions
- This solves "phone connected to device WiFi" — not "phone in pocket elsewhere"
- Full reliability requires cellular plan (ntfy) which owner declined

---

## What Success Looks Like

11 acceptance criteria including:
- User can enable/disable notifications in UI
- Permission flow works on mobile browsers
- Notifications fire on detection
- Debouncing prevents spam
- Settings persist across reloads
- All existing functionality unchanged
- No Rust code touched

---

## Feedback Requested

1. Are the priorities correctly ordered?
2. Are the safety constraints sufficient?
3. Is the discovery-first methodology appropriate for a coding agent?
4. Any gaps in acceptance criteria?
5. Any risks not addressed?

---

## Attachments

- Full project brief: `Rayhunter_Browser_Notification_Project_Brief.md` (284 lines)

---

*End of Review Brief*
