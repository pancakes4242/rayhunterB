# Rayhunter Browser Notification Feature
## Project Brief for Claude Code

**Owner:** Brandon  
**Date:** January 2026  
**Repository:** https://github.com/EFForg/rayhunter (Fork required)

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
- This feature is purely **additive**

**Verification:**
- Run existing tests (if any)
- Manual test existing features after changes
- No regressions

### Priority #3: WORKING NOTIFICATIONS OVER LOCAL WIFI

**What this means:**
- User connects phone to Orbic's WiFi network
- User opens Rayhunter web UI in mobile browser
- User grants notification permission when prompted
- When detection occurs → browser notification fires (visual + sound)
- Must work without any internet connectivity

**This is the core deliverable.**

### Priority #4: MAXIMIZE RELIABILITY WITHIN BROWSER CONSTRAINTS

**What this means:**
- Use Service Worker to improve background reliability
- Use Web Notifications API properly
- Include audio/vibration where supported
- Accept that browser limitations exist (especially on iOS)

**Honest expectation:** Notifications work reliably when tab is open or recently backgrounded. "Phone in pocket, screen off" is NOT achievable with browser tech alone — that requires cellular (ntfy) or native apps. Don't over-promise.

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

1. [ ] A user can enable browser notifications from the Rayhunter web UI
2. [ ] Permission request flow works on mobile browsers (Chrome Android, Safari iOS)
3. [ ] A test notification can be triggered manually to verify setup
4. [ ] When a warning/alert is detected, a browser notification fires automatically
5. [ ] Notifications include sound and/or vibration where supported
6. [ ] Duplicate notifications are prevented (debouncing)
7. [ ] User can disable notifications via the UI
8. [ ] Setting persists across page reloads (localStorage)
9. [ ] All existing functionality continues to work
10. [ ] No Rust code was modified
11. [ ] Code passes existing linting/tests

---

## Technical Constraints

### You MAY:
- Create new files in `daemon/web/`
- Modify existing Svelte components
- Add TypeScript/JavaScript modules
- Add a Service Worker (`sw.js`)
- Use the Web Notifications API
- Use localStorage for preferences
- Add CSS for notification settings UI

### You MAY NOT:
- Modify anything outside `daemon/web/`
- Modify any `*.rs` file
- Add npm dependencies that require network at runtime
- Change backend API contracts
- Remove or alter any existing feature

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
   - Is it polling, websocket, or something else?
   - What triggers UI updates when new warnings arrive?

4. **Existing notification code**
   - Is there any existing notification-related code?
   - How does the ntfy configuration work in the UI?
   - Are there patterns you can follow?

**Document your findings before proceeding to Phase 2.**

### Phase 2: Design

Based on your discoveries:

1. **Decide where to put new code**
   - Service Worker location (likely `public/`)
   - Notification manager module location (follow existing patterns)
   - Settings component location (follow existing patterns)

2. **Decide how to integrate**
   - Where exactly will you hook into the warning detection flow?
   - How will you add the settings UI? (new component? addition to existing?)

3. **Match existing patterns**
   - Your code should look like it was written by the same team
   - Same style, same conventions, same architecture

### Phase 3: Implementation

Build incrementally:

1. Create Service Worker
2. Create notification manager module
3. Create settings UI component
4. Integrate notification trigger with warning handler
5. Add settings component to appropriate place in UI

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

3. **Manual testing (mobile)**
   - Access dev server from phone on same network
   - Test permission flow on iOS Safari
   - Test permission flow on Chrome Android
   - Test backgrounded tab behavior

4. **Build verification**
   - Run `npm run build`
   - Verify no build errors
   - Verify output files look correct

### Phase 5: Documentation & Commit

1. **Review all changes**
   - Confirm only `daemon/web/` files changed
   - No Rust code touched
   - No unintended changes

2. **Commit with clear message**
   - Explain what was added
   - Note it's purely additive
   - Mention testing done

---

## Resources

- **Rayhunter Repository:** https://github.com/EFForg/rayhunter
- **Rayhunter Documentation:** https://efforg.github.io/rayhunter/
- **Web Notifications API:** https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- **Service Worker API:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

## If You Get Stuck

- **Can't find warning data flow:** Search for `warning`, `alert`, `heuristic`, `analysis`, `detection` in the codebase
- **Unsure about code style:** Look at recent PRs in the repo for examples
- **Unsure if something is safe:** If it's outside `daemon/web/`, don't do it
- **Tests failing after changes:** Your changes broke something — investigate before proceeding

---

## Final Checklist Before Submitting

- [ ] Only files in `daemon/web/` were created or modified
- [ ] Zero `*.rs` files touched
- [ ] Code follows existing project style
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Desktop browser testing: notifications work
- [ ] Mobile browser testing: notifications work (best effort)
- [ ] Existing features still work
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
   - How: Web Notifications API + Service Worker
   - Testing: Describe what was tested
   - Safety: Note it's purely additive, no backend changes
5. Be responsive to maintainer feedback

---

*End of Project Brief*
