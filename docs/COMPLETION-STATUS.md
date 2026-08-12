# GloryCast — Completion Status

An honest inventory of what is finished, what is built but unproven, and what
does not exist yet. Written to make "finish the project" a plannable job rather
than a series of surprises.

Sizes are relative (S / M / L), not day estimates. **L** items are a focused
work session or more each.

Last audited: after the production-hardening branch
(`fix/production-hardening-and-bible-engine`).

---

## 1. Verified working

Confirmed by direct testing, not by reading the code.

| Area | Notes |
|---|---|
| GPU compositor | WebGL2, dual PGM/PVW targets, transitions blending full scene textures |
| Scripture voice detection | Whisper (local). Spoken forms, translation switching, book-name normalisation all tested against real model output |
| Bible page — cross-references | 344,800 references, live, spot-checked across multiple verses |
| Scripture projection window | Full-screen and lower-third, both modes rendered and verified |
| Bible translation library | Import of `.bib` files, validation, user library under `userData` |
| Add Source | Camera picker, screen, NDI/network form, colour, timer, clock, test pattern |
| Error containment | Per-page + root boundaries; verified by injecting the original crash |
| Theme tokens | `--gc-app` / `--gc-chrome` / `--gc-well` across Dark, Dim, Light |
| Audio device handling | Duplicate enumeration collapsed by `groupId` |

---

## 2. Built but NEVER verified end to end

**This is the highest-risk category.** The code exists and compiles; nobody has
watched it work.

| Area | Risk | Size to verify |
|---|---|---|
| **Streaming to a real platform** | The core product claim. FFmpeg → RTMP is wired but no stream has been confirmed arriving at YouTube/Facebook | M |
| **Recording** | Same pipeline, same uncertainty | S |
| **Stage Display two-window relay** | IPC built this session; needs two real Electron windows | S |
| **macOS build** | `dmg` target is configured; no `.dmg` has ever been produced | M |
| Licensing / Paddle | Deployed, but the full purchase → activation path is untested by a real buyer | M |
| API.Bible install | Verse-splitting bug fixed but no live install run. **Slated for removal** in favour of the local engine | S |

---

## 3. Placeholder — nav items that go nowhere

Seven sidebar entries render "MODULE NOT YET IMPLEMENTED". A customer clicking
five of twelve nav items hits a dead end.

| Page | Size | Notes |
|---|---|---|
| **Stage Display** | M | Projection window + IPC already exist; this is the control surface over them. **Start here** |
| **Audio Mixer** | L | No Web Audio graph exists. Faders, EQ, compression, routing, bus sends all to build |
| **Media Library** | L | Needs media asset state; pairs with Playback |
| **Playback** | M | Transport, cue points, loop; depends on Media Library state |
| **Graphics** | L | Largest; overlaps the compositor |
| Advanced Routing | — | **Recommend cutting from v1** |
| Multi-Event Control | — | **Recommend cutting from v1** |

Cutting the last two removes two dead ends at zero cost. Twelve nav items with
five working reads worse than seven that all work.

---

## 4. Partially built

| Area | State |
|---|---|
| Video mixer | Transitions and compositing work. No keyers, DSKs, layer transforms or PiP |
| Media source options | Plays, but no per-source audio level, loop or cue points (vMix-style) |
| Image adjustments | Brightness/contrast/saturation exist per-layer on the GPU but are not exposed in the UI |
| Countdown timer | Presets only (5/10/15/30 + label). No target time or end message |
| Bible study tabs | Strong's (14,177 entries) and Topics (6,711) are **built and verified** but their tabs still read the old stubs |
| Bible page layout | Still the original three-column; the Power Bible reading-first redesign was requested but not started |
| Light theme | Colour migration complete for Cinematic. **Minimal and Command workspaces not visually checked** |

---

## 5. Production readiness — largely absent

Features are roughly 40% of what remains. This is most of the rest.

| Item | Size | Notes |
|---|---|---|
| **Code signing** | — | **Longest lead time; start immediately.** Unsigned Windows installers trigger SmartScreen; unsigned macOS builds are blocked by Gatekeeper. Requires purchasing a cert with business verification — waiting, not engineering |
| Crash reporting | M | `ErrorBoundary`'s `console.error` is the intended hook point |
| Auto-update | M | `electron-updater` is a dependency but is not wired. Without it every fix needs manual reinstall by volunteers |
| Onboarding / first-run | M | No guided setup |
| Docs / support path | M | None |
| Real-hardware pilot | L | Never run on a real soundboard feed, projector, on a Sunday |

---

## 6. Suggested order

1. **Order the code-signing certificate.** Pure waiting; blocks shipping.
2. **Prove streaming end to end** to a real platform. If broken, nothing else matters.
3. **Crash reporting.** Small, and you cannot fix what you cannot see.
4. **Decide the v1 nav surface** — cut Routing and Multi-Event.
5. **Stage Display page** — smallest real page; foundations already built.
6. **Pilot with one friendly church for a month.** This will reorder everything below it.
7. Audio Mixer → Playback + Media Library → Graphics.
8. Landing page and business console (independent; can run in parallel).

Steps 1–3 are cheap and unblock everything else. Step 6 is the one that turns
guesses about priority into evidence.

---

## 7. Known caveats

- `tiny.en` is the default Whisper model for **new** installs. An existing
  install still holds `base.en` and must be changed in Settings → AI Services.
- Strong's data is **CC BY-SA** (share-alike). Bundling unmodified is fine;
  redistributing a *modified* dataset obliges the derivative to be CC BY-SA.
  Cross-references and topics are plain CC-BY (attribution only).
- The topical index is OpenBible's, **not** Nave's. Labelled accurately in the
  data file so the UI cannot misattribute it.
- GloryCast ships **public-domain scripture only** (WEB, KJV). Licensed
  translations are supplied by each church from files they own.
