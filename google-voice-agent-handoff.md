# Google Voice texting bridge — handoff for the agent that will run this autonomously

## Goal
The user wants to text "an agent" (Christopher Dlugolinski, dlugolinski13@hotmail.com is his general email; the Google account below is separate) from his phone and have an AI agent read and reply to those messages. This document was written by Claude Code at the end of a session that got the *mechanism* working manually. It does not yet run autonomously — that's the next agent's job, per the user's plan to wire it up in his "main project for claude app" (outside this one-off coding session).

## What was tried first and abandoned
Spectrum-TS (Photon, https://photon.codes/docs/spectrum-ts) was the original plan for true iMessage support. Investigation found two providers:
- `@spectrum-ts/imessage` — cloud provider, no OS restriction, Node/Bun.
- `@spectrum-ts/imessage-local` — macOS-only, needs Messages.app + Full Disk Access to `~/Library/Messages/chat.db`.

This was **not pursued further** — no Photon account was created, no code was written against it. The user pivoted to Google Voice instead because it could be tested immediately with tooling already on hand (Playwright MCP). If the next agent wants real iMessage instead of SMS/Google Voice, Spectrum-TS's cloud provider is the untested lead to pick back up.

## What's actually working: Google Voice via Playwright browser automation
No API integration exists. This is pure browser UI automation through the **Playwright MCP server** (`@playwright/mcp`), which is already configured at **user scope** on this machine (`claude mcp add -s user playwright -- npx -y @playwright/mcp@latest`) — any Claude Code session here can use it once the session picks up MCP tools (may need a session restart to see the `mcp__playwright__*` tools).

### Verified end-to-end in this session
1. Navigated to `https://accounts.google.com/signin/v2/identifier?service=grandcentral&continue=https://voice.google.com/u/0/calls` (going straight to `voice.google.com` redirects to a marketing page when logged out — go through `accounts.google.com` instead).
2. Signed in as **dlugolinski13@gmail.com** (account name "Christopher Dlugolinski").
3. **2-Step Verification is required** — Google sent a push notification to the user's physical Google Pixel 8 Pro, which he had to approve manually on the device. **This cannot be automated** and is a real risk for unattended/autonomous runs — see "Open problems" below.
4. Landed on Google Voice, number **(216) 395-7681**.
5. Clicked the "Messages" tab, then "Send new message".
6. Entered recipient `3215910093` → matched to **(321) 591-0093** — this is the number the user will text the agent from/to.
7. Typed and sent a test message; it appeared in the thread.
8. Re-navigated to the thread URL and confirmed a reply ("Got it") had arrived.

### Key URLs / UI structure
- Messages tab: `https://voice.google.com/u/0/messages`
- A specific thread: `https://voice.google.com/u/0/messages?itemId=t.%2B1<10-digit-number>` (e.g. `t.%2B13215910093` for (321) 591-0093) — reloading this URL and re-reading the page is how you check for new replies.
- Compose flow: "Send new message" button → recipient goes in a "Type a name or phone number" field (typing the digits surfaces a "Send to (xxx) xxx-xxxx" button/suggestion to click) → message body in a "Type a message" textbox → "Send message" button.
- Reading messages: `mcp__playwright__browser_snapshot` (accessibility tree) was used throughout instead of screenshots — it reliably exposes message text, timestamps, and read/unread counts (e.g. tab label becomes "Messages: 1 unread").

## Open problems the next agent needs to solve
1. **Session persistence.** It's untested whether the Playwright MCP browser context persists cookies/login between separate tool invocations or Claude Code sessions. If it doesn't, every run would hit the Google sign-in + 2FA-push wall again, and the push approval is a hard manual step — that would break autonomy entirely. Investigate using a persistent browser profile / `user-data-dir` so the Google session survives across runs, so login only has to happen once.
2. **No persistent execution.** Claude Code (this agent) has no daemon / always-on mode — sessions only run when externally triggered, and `CronCreate` jobs are session-scoped and expire after 7 days. Whatever "runs this autonomously" has to live in the user's separate "main project for claude app" setup and trigger a session/agent periodically (or on some event) to check the thread URL above and reply. This document doesn't solve that scheduling problem — it only documents that the underlying send/check mechanism works once a session is running.
3. **Credentials were never written to disk.** The Google account password was typed directly into the browser's password field via Playwright during this session and is **not included in this document** — see below.

## Credentials — do not paste the password into a file
The user gave the Google account password directly in chat during this session so it could be typed into the sign-in form. I deliberately did not write it into any file, repo, or persisted memory. For the next agent to log in (assuming the persistent-session problem above isn't solved first), it will need:
- Email: `dlugolinski13@gmail.com`
- Password: the user has it; have him type/paste it directly into that agent's own session when prompted, or — better — have him put it in a local secrets store (env var, OS credential manager, etc.) that the automation reads at runtime, rather than pasting it into a chat that might get written to a summary/handoff doc again.
- 2-Step Verification: currently a push to his physical Pixel 8 Pro. He'll need to approve it manually the first time (and possibly every time, per open problem #1).

## Related, separately-working infrastructure (not part of this bridge, but relevant to the user's broader goal)
- A **Gmail MCP connector** is already connected at the user's claude.ai account level (`mcp__claude_ai_Gmail__*` tools), confirmed working (`list_labels` succeeded). The user's end goal after the texting bridge is a cron-style job to check this inbox — not yet built.
- This all originated from `d:\Product_Website` (a Vue/Azure Functions ordering-site project — unrelated to this bridge except that's the repo the session was in). Don't confuse the two; nothing here should be committed to that repo.
