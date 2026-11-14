# ProductDemo rehearsal

- **Gold copied:** `hero-demo` (corner bleed, named targets, cursor beats), with `table-edit`'s "edit, then the total rolls a beat later".
- **Story:** the pointer clicks the Lonavala gauge. The inspector rolls to it, the weights shift towards WRF and GraphCast, the blend counts 12 → 86 mm, and a Heavy rain badge fades in. After the payoff holds, a click on Pune City resets the loop, so the reset has a visible cause. The loop runs about 10 s.
- **Where:** `App.tsx` shows it on the loading/offline screen above the status card.
- **Filmed:** wide (720×440) and compact (358×356, at a 390 viewport). `--gate` passed at both widths.
- **Known film line:** `settle snap` / `appears with no entrance` on `ss-count`. When the loop restarts, the Count's 20-digit strip moves by exactly one cycle (130 px), so the same digit stays on screen. Nobody can see it.
- **Not checked:** dark mode (the app has none), and the real offline screen with the backend actually stopped. I checked it by mounting the demo over the live page instead.
