# Rayhunter Browser Notification Feature
## Project Brief for Claude Code

**Owner:** Brandon  
**Date:** January 2026  
**Repository:** https://github.com/EFForg/rayhunter (Fork required)  
**Version:** 2.0 (Revised based on code review)

---

## What This Document Is

This is a project brief, not a code specification. You (Claude Code) will discover the codebase structure, make implementation decisions, and write the code. This document tells you:

1. **What we're trying to accomplish** (the goal)
2. **What success looks like** (acceptance criteria)  
3. **What you must not do** (safety constraints)
4. **How to approach this** (methodology)

---

## The Goal

Add browser notification support to Rayhunter's web UI so users can receive audio/visual alerts on their phone when suspicious cellular activity is detected — without requiring a cellular data plan.

### Context

Rayhunter is an IMSI catcher detector that runs on cheap mobile hotspots (Orbic RC400L). It has a web UI (Svelte frontend) accessible at `http://192.168.1.1:8080` when connected to the device's WiFi.

Currently, notifications require cellular data (via ntfy). The owner wants notifications that work over local WiFi only — when their phone is connected to the Orbic and has the browser open.

### User Story

> As a Rayhunter user without a cellular plan, I want to receive a browser notification (sound + popup) when suspicious activity is detected, so I don't have to constantly watch the screen or device.

---

## ⚠️ Critical Feasibility Constraints

**Before proceeding, understand these limitations:**

### Secure Context Requirement

The Web Notifications API and Service Workers require a **secure context** (HTTPS or localhost). The Rayhunter device serves its UI over plain HTTP (`http://192.168.1.1:8080`), which is **not** a secure context.

**Implications:**
- **iOS Safari:** Will almost certainly block notifications entirely. No workaround without HTTPS.
- **Chrome Android:** May allow notifications on HTTP in some versions, but behavior is inconsistent.
- **Desktop browsers:** Generally more permissive for local IPs, but not guaranteed.

**What this means for the project:**
- Service Worker registration may fail on the device
- Notification permission requests may be blocked
- This feature is **best-effort** — it will work where browsers allow it
- The implementation must **gracefully degrade** when APIs are unavailable
- Consider in-page alerts (sound + visible banner) as fallback when notifications are blocked

### Background Tab Limitation

The current codebase explicitly stops polling when the tab is hidden:

```javascript
if (document.hidden) return;
```

This is a deliberate design choice in `+page.svelte`. **Do not remove this guard** — it exists for battery/performance reasons.

**Implication:** Notifications will only trigger when the UI tab is **open and visible**. "Phone in pocket, screen off" notifications are **not achievable** with this architecture without backend changes (which are forbidden).

---

## Priorities (In Order)

These are non-negotiable and ranked. When in conflict, higher priorities win.

### Priority #1: DO NOT BRICK THE DEVICE

**What this means:**
- Only modify files in the web frontend (`daemon/web/`)
- Do NOT touch any Rust code (`*.rs` files)
- Do NOT touch system files, bootloader, firmware, kernel
- Do NOT modify backend API behavior
- If you're unsure whether a change could affect device operation, **stop and flag it**

**Why this matters:**  
The Orbic RC400L can become unrecoverable if firmware is corrupted. The owner cannot easily recover from a bricked device. This is a hard boundary.

### Priority #2: DO NOT BREAK EXISTING FUNCTIONALITY

**What this means:**
- All current features must continue working exactly as before
- Detection heuristics: unchanged
- PCAP logging: unchanged
- ntfy-over-cellular: unchanged
- Device display (green/red line): unchanged
- Web UI existing features: unchanged
- The `document.hidden` guard in the polling loop: **unchanged**
- This feature is purely **additive**

**Verification:**
- Run existing tests (if any)
- Manual test existing features after changes
- No regressions

### Priority #3: WORKING NOTIFICATIONS OVER LOCAL WIFI (WHERE SUPPORTED)

**What this means:**
- User connects phone to Orbic's WiFi network
- User opens Rayhunter web UI in mobile browser
- User grants notification permission when prompted (if browser allows)
- When detection occurs → browser notification fires (visual + sound where permitted)
- Must work without any internet connectivity

**This is the core deliverable, with the understanding that browser support varies.**

### Priority #4: BEST-EFFORT RELIABILITY WITHIN BROWSER CONSTRAINTS

**What this means:**
- Use Service Worker **if** secure context allows registration
- Use Web Notifications API **if** browser permits on HTTP
- Include audio/vibration **where browser policy allows** (may be blocked without user gesture)
- Accept that browser limitations exist (especially on iOS)
- **Gracefully degrade** — if notifications unavailable, show in-page alerts

**Realistic expectation:** Notifications work when the tab is **open and visible** on browsers that permit HTTP notifications. Background notifications and iOS Safari are likely unsupported. Do not over-promise.

### Priority #5: SIMPLICITY AND ELEGANCE

**What this means:**
- Minimum code to achieve the goal
- No unnecessary dependencies
- Match existing code style exactly
- Easy for Rayhunter maintainers to review
- Potential upstream contribution

---

## Acceptance Criteria

The feature is complete when:

### Core Functionality
1. [ ] A user can enable browser notifications from the Rayhunter web UI
2. [ ] Permission request flow works on supported browsers (Chrome Android best-effort, iOS Safari expected to fail)
3. [ ] A test notification can be triggered manually to verify setup
4. [ ] When a warning/alert is detected, a browser notification fires automatically (when tab is visible)
5. [ ] Notifications include sound and/or vibration **where permitted by browser policy**
6. [ ] Duplicate notifications are prevented (see debouncing rules below)
7. [ ] User can disable notifications via the UI
8. [ ] Setting persists across page reloads (localStorage with `onMount()` guard)
9. [ ] Browser notification settings are **visually separated** from ntfy settings in the UI

### Safety & Compatibility
10. [ ] All existing functionality continues to work
11. [ ] No Rust code was modified
12. [ ] The `document.hidden` polling guard was NOT removed or altered
13. [ ] Code passes existing linting/tests

### Graceful Degradation
14. [ ] If Notifications API is unavailable (secure context issue), feature degrades gracefully with user-facing message
15. [ ] If Service Worker registration fails, notifications still attempt via main thread
16. [ ] In-page visual indicator (banner/flash) shows warnings regardless of notification API support

### Trigger & Debouncing Rules
17. [ ] **Trigger definition:** Notify when a manifest entry's warning count transitions from `0` to `>0` after an analysis report is fetched
18. [ ] **Debouncing rule:** One notification per manifest entry ID when warning count increases from zero; do not re-notify for the same entry on repeated polls unless warning count was reset to zero and increases again

---

## Technical Constraints

### You MAY:
- Create new files in `daemon/web/`
- Modify existing Svelte components
- Add TypeScript/JavaScript modules
- Add a Service Worker in `daemon/web/static/` (SvelteKit convention)
- Use the Web Notifications API (with feature detection)
- Use localStorage for preferences (guarded with `onMount()` for SSR safety)
- Add CSS for notification settings UI

### You MAY NOT:
- Modify anything outside `daemon/web/`
- Modify any `*.rs` file
- Add npm dependencies that require network at runtime
- Change backend API contracts
- Remove or alter any existing feature
- Remove or modify the `document.hidden` guard in the polling loop

---

## Implementation Approach

### Phase 1: Discovery (REQUIRED FIRST)

Before writing any code, you must understand:

1. **Repository structure**
   - Clone the repo
   - Explore `daemon/web/` thoroughly
   - Identify the frontend framework setup (Svelte + Vite + TypeScript)

2. **Existing code patterns**
   - How are components organized?
   - What's the naming convention?
   - How is state managed?
   - What's the code style (indentation, quotes, semicolons)?

3. **Data flow for warnings**
   - Where does the UI receive warning/alert data from the backend?
   - What's the data structure for a warning?
   - Is it polling, websocket, or something else? (Answer: Polling via `manager.update()` and `get_manifest()`)
   - What triggers UI updates when new warnings arrive?
   - Note the `document.hidden` guard that stops updates in background tabs

4. **Existing notification code**
   - Is there any existing notification-related code? (Answer: Yes, ntfy config in `ConfigForm.svelte`)
   - How does the ntfy configuration work in the UI?
   - Are there patterns you can follow?
   - Note: ntfy settings are server-backed (`/api/config`); browser notification settings will be localStorage-only

**Document your findings before proceeding to Phase 2.**

### Phase 2: Design

Based on your discoveries:

1. **Decide where to put new code**
   - Service Worker location: `daemon/web/static/sw.js`
   - Notification manager module location (follow existing patterns in `src/lib/`)
   - Settings component location (follow existing patterns)

2. **Decide how to integrate**
   - Where exactly will you hook into the warning detection flow?
   - How will you track which manifest entries have already triggered notifications? (for debouncing)
   - How will you add the settings UI? (Recommend: new clearly-labeled section in ConfigForm, separated from ntfy settings)

3. **Plan graceful degradation**
   - How will you detect if Notifications API is available?
   - What message will you show if it's blocked?
   - What in-page fallback will you provide?

4. **Match existing patterns**
   - Your code should look like it was written by the same team
   - Same style, same conventions, same architecture

### Phase 3: Implementation

Build incrementally:

1. **Feature detection layer** — Check if Notifications API and Service Worker are available
2. **Notification manager module** — Handle permission, sending notifications, debounce tracking
3. **Service Worker** (best-effort) — Register if secure context allows
4. **Settings UI component** — Separate section from ntfy, with clear labels
5. **Integrate notification trigger** — Hook into warning handler with proper trigger logic
6. **In-page fallback** — Visual indicator when notifications unavailable or for redundancy
7. **localStorage persistence** — With `onMount()` guard for SSR safety

### Phase 4: Testing

1. **Unit/type checking**
   - Run `npm run lint` (if available)
   - Run `npm run typecheck` or `npx tsc --noEmit` (if TypeScript)
   - Fix any errors

2. **Manual testing (desktop)**
   - Run dev server (`npm run dev`)
   - Test permission flow
   - Test notification display
   - Test settings persistence
   - Test debouncing (same warning shouldn't re-trigger)

3. **Manual testing (mobile)**
   - Access dev server from phone on same network
   - Test permission flow on Chrome Android
   - Test permission flow on iOS Safari (expect failure — verify graceful degradation)
   - Note: Background tab testing is not meaningful due to `document.hidden` guard

4. **Secure context testing**
   - Test on actual device HTTP address if possible
   - Document which browsers allow/block the feature
   - Verify graceful degradation message appears when blocked

5. **Build verification**
   - Run `npm run build`
   - Verify no build errors
   - Verify output files look correct

### Phase 5: Documentation & Commit

1. **Review all changes**
   - Confirm only `daemon/web/` files changed
   - No Rust code touched
   - No unintended changes
   - `document.hidden` guard untouched

2. **Commit with clear message**
   - Explain what was added
   - Note it's purely additive
   - Mention testing done
   - Note secure context limitations discovered

---

## Resources

- **Rayhunter Repository:** https://github.com/EFForg/rayhunter
- **Rayhunter Documentation:** https://efforg.github.io/rayhunter/
- **Web Notifications API:** https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- **Service Worker API:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Secure Contexts:** https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts

---

## If You Get Stuck

- **Can't find warning data flow:** Search for `warning`, `alert`, `heuristic`, `analysis`, `detection` in the codebase
- **Unsure about code style:** Look at recent PRs in the repo for examples
- **Unsure if something is safe:** If it's outside `daemon/web/`, don't do it
- **Tests failing after changes:** Your changes broke something — investigate before proceeding
- **Service Worker won't register:** Likely secure context issue — implement graceful degradation
- **Notifications blocked on mobile:** Expected on iOS, possible on Android — ensure fallback works

---

## Final Checklist Before Submitting

- [ ] Only files in `daemon/web/` were created or modified
- [ ] Zero `*.rs` files touched
- [ ] The `document.hidden` polling guard is untouched
- [ ] Code follows existing project style
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Desktop browser testing: notifications work (or graceful degradation if blocked)
- [ ] Mobile browser testing: documented which browsers work/fail
- [ ] Graceful degradation: verified message appears when APIs unavailable
- [ ] Existing features still work
- [ ] Browser notification UI is clearly separated from ntfy settings
- [ ] Commit message is clear and professional

---

## Notes for Potential Upstream Contribution

If the owner wants to contribute this back to EFForg/rayhunter:

1. Fork the repo (not just clone)
2. Create a feature branch
3. Make changes on the branch
4. Write a clear PR description:
   - What: Browser notifications for local WiFi alerts
   - Why: Enables notifications without cellular plan
   - How: Web Notifications API + Service Worker (best-effort)
   - Limitations: Requires secure context; iOS Safari unsupported; only works when tab is visible
   - Testing: Describe what was tested and on which browsers
   - Safety: Note it's purely additive, no backend changes
5. Be responsive to maintainer feedback

---

*End of Project Brief*
