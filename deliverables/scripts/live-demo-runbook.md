# Live-demo runbook — local rehearsal

This is the operator script. The lead's observed rehearsal results belong in `docs/verification.md`; the steps below alone are not proof they passed. Three/five minutes are working local-pitch options. Keep the seven-slide global alternative within its separate limit.

## Prepare the laptop

1. Keep the development Mac awake, on mains power. Close notifications and unrelated apps/windows before the audience sees the screen.
2. Use the integrated checkout `NASA-Space-Apps-2026`, branch `overnight/integration`. Do not switch to an agent worktree for the live run.
3. From `web/`, run `npm run build`, then `npm run preview -- --host 0.0.0.0 --port 4173`. If already running, reuse the process after verifying it serves the current build. Development preview currently uses a separate Vite port; take the actual URL from the running process or final handoff rather than assuming 5173.
4. On the Mac, open `http://127.0.0.1:4173/`. For a phone on the same Wi-Fi, replace loopback with the Mac's current LAN address. The lead observed `192.168.1.115` during development; this can change. Firewall/router isolation can block another device. Physical phone reachability was not verified.
5. For offline rehearsal use **localhost on the Mac**, wait for **OFFLINE BUNDLE READY**, and preload the featured cases and Report. LAN HTTP is not a secure context for service workers. A new historical month may need one online visit; a hard reload can bypass the offline cache. Do not promise offline external articles.
6. Open the deck PDF and the finished short montage, if available, before disconnecting networking. Keep `deliverables/captures/` available as still-image fallback.
7. Use 100% browser zoom initially. Show reduced motion if the presenter or audience prefers it; no demonstration should depend on animation being enabled. Use explicit buttons when a trackpad gesture is unreliable.

## Exact short live route

| Step | Operator action | Expected evidence / words to say | Fallback |
| --- | --- | --- | --- |
| 1 | Load `/?tab=explore` with no case parameters. | Global opening; name the displayed snapshot dates. “This is a separate recent observation snapshot.” | Globe capture, once verified. |
| 2 | Activate the atlas/unfold control; select Europe/Greece through the visible hierarchy. | Geographic anchors and broader context remain clear. “The map opens into places we can investigate.” | Atlas capture. A still does not prove motion; call it an atlas view. |
| 3 | Open the Evros study; if needed load `/?tab=explore&case=evros&month=2023-08&sensor=all`. Activate sensor comparison. | Dated regional scene and separate Aqua/S-NPP records. “Different sensors produce different observations.” | `regional-comparison.png`. |
| 4 | For the headline annual finding, load `/?tab=report` without case/month parameters. Select/reset to Greece study areas, VIIRS, 2023 if required. | 4,685 annual detections and August 4,178 / 89%. State “two Greek study rectangles,” not a national total. | `report-overview.png`. |
| 5 | Click August and press Enter; click 22 and Enter; click 00 and Enter. Use Zoom buttons if the visual focus is elsewhere. | Month → day → hour: 4,178 → 1,938 → 1,009. “These are acquisition hours, not ignition times.” | Remain at annual finding; the short pitch does not need every level. |
| 6 | Reset Report, choose Across years, then Two satellites. | Recurrence and separate raw counts. Mention source availability differs from observing effort. | Skip to Science when time is short. |
| 7 | Open The science / `/?tab=methods`. | 48 sampled cell-passes, seasonal baseline best, monthly release closed. “The next test is independent monthly validation.” | `science-status.png` or deck slide 5. |
| 8 | Return to the deck's final slide. | “Choose a place. Follow a season. See what the satellites actually recorded.” | Finish directly from PDF. |

Step 2's exact atlas labels must be reconciled with the integrated UI after the atlas agent's final commit. This runbook deliberately does not invent a verified button label before that inspection. The lead should replace this sentence with its observed labels and record the tested sequence before final handoff.

## If something fails

- A loading/error state: use Retry once. If it persists, move to the saved capture/PDF and state that the live view is unavailable. Do not wait through the pitch.
- Unsupported geography/date: keep the unavailable label visible, then choose the offered featured month or reset to the supported annual record. Missing data is not zero.
- Slow graphics: pause ambient motion/reduce motion, use the atlas/explicit controls, and shorten the route. Do not change the data or release state for presentation.
- No Wi-Fi: use the preloaded production rehearsal route; otherwise show the local PDF/capture montage. External reporting links are optional.
- No time: use slides 1, 2, 4, 5, 6 and 7; keep all seven in the submitted deck. Never add an eighth slide to the seven-slide global file.

## Rehearsal log template

Record date/time, exact commit, server URL/port, browser, viewport, online/offline state, route, observed result and any fallback used. A timed spoken rehearsal and physical phone gestures remain separate from desktop/emulated checks. See the final handoff for completed checks and limits.
