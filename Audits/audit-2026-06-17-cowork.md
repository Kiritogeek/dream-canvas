# DreamWeave — Daily Comprehensive Audit
**Date:** 17 June 2026 · Automated audit run

> **Source-dating note (important):** Section 1 requires sources no older than 30 days (i.e. dated within ~17 May–17 June 2026). The web surfaced almost no comic/webtoon-AI coverage strictly inside that window — most indexed pages are evergreen "best-of" pages stamped March/April/May 2026 or undated. Each finding below carries its visible/estimated date and is flagged ✅ (in-window) or ⚠️ (out-of-window / undatable). Out-of-window items are kept only as directional context, not as compliant evidence.

---

## 1. 🔍 Benchmark & Competitive Intelligence

### Direct competitors & recent moves

**Webtoon — AI translation beta (CANVAS)** ⚠️ *date undated, references "Spring 2026"*
Webtoon is rolling out an opt-in AI translation program letting creators translate their work into supported CANVAS languages. Relevant because translation/localization is a distribution lever DreamWeave entirely lacks.
Source: https://screenrant.com/webtoon-ai-translation-indie-comic-creator-boost/

**Jenova Webtoon Creator** ⚠️ *pages stamped March–April 2026*
Scene-first, "agentic" generation of full-color vertical-scroll scenes, character consistency "across entire seasons / 100+ episodes," mobile formatting baked in. Paid from $20/mo. This is the closest positional rival to DreamWeave's promise.
Sources: https://www.jenova.ai/en/resources/ai-webtoon-creator · https://www.jenova.ai/en/resources/best-ai-for-webtoon-creation

**Anifusion** ⚠️ *"2026" evergreen page*
Positioned as an all-in-one AI manga/comic studio (text prompt → professional pages). Direct feature overlap.
Source: https://anifusion.ai/articles/best-ai-manga-generators-2026/

**ComicPad / Komiko / "AI Webtoon Comic Maker" (App Store)** ⚠️ *undated / evergreen*
A thickening layer of low-cost prompt-to-page apps. They commoditize the "text → comic page" step that is also DreamWeave's headline.
Sources: https://www.comicpad.app/how-to-make-a-webtoon · https://komiko.app/ai-comic-generator/ai-webtoon-generator · https://apps.apple.com/us/app/ai-webtoon-comic-maker/id6756670628

**Dashtoon Studio** ⚠️ *carried over from prior internal audit (audit-2026-06-17.md)*
Highest-rated suite in third-party testing; storyboard→episode in ~5–6h, LoRA character sheets, upscaling, real-time collaboration, AND its own reader/monetization channel. Best-funded competitor. This is the benchmark to beat on workflow completeness + distribution.

### Underlying tech the field is standardizing on

**FLUX.2 / FLUX.2 Pro (Black Forest Labs)** ⚠️ *model released Nov 2025; guide pages 2026*
"Identity Persistence" for following a subject across generations, up to 8–10 reference images, big gains on hands/faces/fabric. This is exactly the model DreamWeave already runs (FLUX.2 Pro via fal.ai) — so DreamWeave is on the current frontier model, not behind it.
Sources: https://blog.fal.ai/flux-2-is-now-available-on-fal · https://starryai.com/en/blog/flux-2 · https://fal.ai/models/fal-ai/flux-2-lora-gallery/digital-comic-art

### Community sentiment (themes, not datable to current month) ⚠️

The recurring complaint across communities is **"character drift"** — protagonists that mutate by episode 3 with general-purpose generators. The accepted fix is a **system-level character anchor** (identity embeddings / LoRA, 1–3 reference images), which validates DreamWeave's **Sheet System** as the right architectural bet. Second recurring theme: **"consistency + cadence beat perfection"** — audiences reward weekly publishing. Implication for DreamWeave: speed-to-episode and consistency matter more than maximal image quality.
Source: https://aitribune.net/2026/05/08/ai-webtoon-in-2026/ (8 May 2026 — just outside the 30-day window)

**Bottom line for §1:** DreamWeave sits on the right model (FLUX.2 Pro) and the right consistency primitive (Sheet System). Its competitive gap is **not generation quality** — it is **distribution/monetization** (Webtoon, Dashtoon) and **workflow polish/speed** (Jenova, Dashtoon).

---

## 2. 🛠️ Technical Audit

Codebase scanned: 173 TS/TSX files, ~41.7k LOC in `src/`, 14 Edge Functions, 42 SQL migrations, 4 test files.

| Axis | Score /10 | Justification |
|---|---|---|
| Code quality | **8.0** | Zero `: any`, zero `@ts-ignore`/`@ts-nocheck`, zero `TODO/FIXME/HACK`, only 8 `console.log` in `src/`. ESLint flat config with `--max-warnings 0` enforced via `lint-staged` + Husky pre-commit. Strong typing discipline. Penalty: a handful of god-files — `ChapterDetail.tsx` (2,501 LOC), `LoreGraphView.tsx` (2,244), `ScenarioChapterEditor.tsx` (2,042), `SpeechBubbleEditor.tsx` (1,543) — concentrate complexity and risk. |
| Overall architecture | **8.5** | Clean bottom-up layering (`types → integrations → services → hooks → components → pages`), enforced by convention. Lazy-loaded routes in `App.tsx`. Clear separation between client (Supabase JS) and 14 single-purpose Edge Functions. Plan logic centralized in one source of truth (`TIER_CONFIG`, `src/types/index.ts`) and mirrored server-side (`_shared/tierConfig.ts`). Vector search (pgvector) cleanly isolated in `narramind-compass`. |
| Performance & scalability | **7.0** | 241 `useMemo`/`useCallback` usages signal real attention to render cost, plus a static perf-audit hook (`.claude/scripts/perf-audit.sh`) on every Edit/Write. But only 3 `React.memo` against several 1,500–2,500-LOC interactive canvas components is thin — the editor is the most render-heavy surface. Server scalability is sound (stateless functions, monthly usage counted via indexed query). Image generation is FAL.ai-bound (external latency), mitigated by Studio-tier priority. |
| Security | **8.5** | No service-role key anywhere in `src/` (0 hits). Edge Functions run `verify_jwt=false` at the gateway **by design**, then **manually verify** every caller by calling `/auth/v1/user` with the bearer token and extracting `user.id` before any service-role read (`generate-asset-image` verifies user → loads plan → enforces quota → checks asset `user_id` ownership). Stripe webhook verifies the Stripe signature via `constructEventAsync` and is documented as the **only** path allowed to mutate `profiles.plan`. Admin functions gate on a server-side email check (403 otherwise). RLS present across migrations. Minor: admin email is hardcoded (`kiritogeek@gmail.com`) in function source rather than env/role table. |
| Technical debt | **7.5** | Low rot (no dead markers, no `any`). Debt is concentrated, not diffuse: (a) the 4–5 god-components; (b) **test coverage is the weak point** — 4 test files for ~170 source files leaves the canvas, quota, and Stripe paths largely unguarded by automated tests despite "0 régression" being a stated Definition-of-Done gate; (c) a stale `dist/` is committed (build artifacts dated May 23 in the repo). |

**Specific file evidence:** `supabase/functions/generate-asset-image/index.ts` (lines ~125–147 token verification, ~561–634 quota enforcement, ~668 ownership check); `supabase/functions/stripe-webhook/index.ts` (lines ~76–94 signature verification); `supabase/config.toml` (documented `verify_jwt=false` rationale); `src/types/index.ts` (`TIER_CONFIG`, lines 25–56).

---

## 3. 📦 Product Audit

**Positioning vs delivery — strongly aligned.** The stated promise ("coherent visuals in seconds, no illustration skills") maps directly to shipped features: Sheet System (4-angle composite for consistency), FLUX.2 Pro generation, scenario AI (Groq Llama 3.3 70B), chapter/panel découpage, vertical canvas composition, full chapter export. The "tout gratuit" strategy (all features on every tier, differentiation by credit volume) is consistently implemented — `TIER_CONFIG` confirms only `allowLongMemory` + FAL priority are Studio-gated.

**Inconsistencies / risks:**
- **Distribution gap is a positioning hole, not a bug.** Competitors (Webtoon, Dashtoon) close the loop create→publish→monetize. DreamWeave stops at "export chapter." For a creator chasing weekly cadence + audience, this is the biggest unmet job-to-be-done.
- **Univers v1 (cartography + Ariane) is the current 🔴 roadmap item** and not yet delivered — the lore graph (`LoreGraphView.tsx`, 2,244 LOC) exists but the "continuous improvement / Ariane scans scenario" pillar is the in-flight half. Promise-vs-delivery should be watched here.
- **Mobile:** spec exists (`Produit/13_Specifications_Application_Mobile.md`) but the app is desktop-web; webtoon *consumption* is mobile-first, and rival apps ship native iOS. Creation-on-desktop is defensible, but worth an explicit stance.

**Underused / redundant:** the lore graph is heavy (2.2k LOC) for a v1 whose ADN is deliberately narrow (cartography + Ariane, explicitly *not* timeline/frise). Ensure the graph's surface area matches that narrow scope rather than accreting features the ADN rule forbids.

---

## 4. 🎨 UX / UI Audit

**Design system coherence — high.** Fonts correctly set to Quicksand (display) / Nunito (body) in `tailwind.config.ts` (Inter explicitly banned). Glassmorphism tokens (`.glass`, `.gradient-primary`, `.text-gradient`) centralized. A dedicated taste/anti-slop skill and `.impeccable.md` pre-flight gate UI work.

**Friction / findings:**
- **~130 hardcoded hex colors** in `src/components` + `src/pages` `.tsx` — against the "never hardcode colors, use HSL tokens" rule. Worth a sweep; some are legitimate (SVG strokes/gradient stops) but the count warrants a pass.
- **Em-dash usage:** ~70 em-dashes appear inside JSX strings/quotes. The clear majority are legitimate "no-data" placeholders (`value={d ? … : "—"}` in admin KPI cards) which is a valid UI convention — but a few sit in prose labels (e.g. "Nouveaux utilisateurs — historique…") and technically violate the zero-em-dash-in-prose rule. Low severity, quick fix.
- **Journey fluidity:** the core path (Style → Assets → Scénario → Éditeur) is coherent and lazy-loaded. The render-heavy editor (2.5k-LOC `ChapterDetail`) is the surface most likely to feel laggy on lower-end machines — see §2 perf.

**Vs competitor UX standards (from §1):** rivals lean into *speed-to-episode* (Dashtoon ~5–6h/episode, Jenova "agentic" scene generation). DreamWeave's multi-step editor is more controllable but heavier; the competitive UX bar is "fewest clicks from idea to publishable episode."

---

## 5. 💡 Improvement Suggestions

### 🗑️ Removals
- **Stale committed `dist/`** — build artifacts (dated May 23) shouldn't live in the repo; gitignore them to cut noise and avoid serving stale bundles.
- **Scope-creep guard on the lore graph** — trim any `LoreGraphView` surface that drifts from the v1 ADN (cartography + Ariane only; no timeline). Don't grow a 2.2k-LOC component further before Univers v1 ships.

### ⚡ Optimizations
- **Split the god-components** (`ChapterDetail`, `ScenarioChapterEditor`, `LoreGraphView`, `SpeechBubbleEditor`) — extract sub-views; this is the single highest-leverage maintainability + perf move. Pair with targeted `React.memo` on canvas layers (currently only 3 in the codebase).
- **Raise test coverage on the money/quota/canvas paths** — 4 tests for ~170 files undercuts the stated "0 régression" gate. Prioritize `canGenerate()`, quota enforcement, and Stripe webhook plan-mutation.
- **Lean into speed-to-episode** to match Dashtoon/Jenova's UX bar (⚠️ Jenova/Dashtoon, March–April 2026) — measure and shrink clicks from scenario → exported chapter.

### ➕ Additions
- **Distribution/monetization loop** — the clearest competitive gap. Even a lightweight "publish to reader link / shareable episode" closes the create→audience loop that Webtoon and Dashtoon own (⚠️ Webtoon translation/distribution, undated; Dashtoon, internal-audit).
- **Localization/translation** mirroring Webtoon's AI translation beta (⚠️ screenrant, undated) — high-leverage for indie reach given DreamWeave already runs an LLM (Groq) it could reuse.
- **Double down on the character-anchor story in marketing** — "character drift" is the field's loudest pain (⚠️ aitribune, 8 May 2026), and the Sheet System is a genuine differentiator. It's under-told.

---

## 6. 🚀 Launch Status

**Context:** runs locally / Vercel-style, not publicly announced. Stack is production-shaped (Supabase Auth + RLS, Stripe live-path functions, 14 deployed Edge Functions).

**Readiness assessment:** Backend/security are launch-grade (§2). The blockers are **test coverage**, **a few god-components carrying core flows**, and **no public distribution surface for end-readers**.

**Prioritized launch checklist**
1. **P0 — Verify the billing loop end-to-end:** real Stripe checkout → webhook → `profiles.plan` update → quota reflected. This is the one path where a bug costs money/trust.
2. **P0 — Quota integrity test:** automated test that `canGenerate()` (client) and the Edge-Function quota count cannot diverge (a prior commit, `2857bc5`, already fixed one such desync — lock it with a test).
3. **P0 — gitignore `dist/`** and confirm CI builds fresh.
4. **P1 — Smoke-test the full journey** Style→Assets→Scénario→Éditeur→Export on a clean account (empty-state, quota-hit, libre-tier edge cases).
5. **P1 — Error/observability baseline** on Edge Functions (FAL.ai failures, Groq fallback path).
6. **P2 — Decide the distribution stance** before announcing (export-only vs shareable reader link) so messaging matches the product.
7. **P2 — Legal/UX:** AI-content disclosure, ToS, FAL.ai usage terms surfaced to users.

---

## 7. 📣 Marketing Plan

Current posture: no public presence; landing page exists (`src/pages/Landing.tsx`, recently updated per git log). Plan is acquisition-first, low-budget, leaning on the genuine differentiator (character consistency via Sheet System).

| Task | Priority | Effort |
|---|---|---|
| Write an acquisition landing page that leads with "no character drift" (Sheet System) + a 30-sec before/after | **High** | Medium |
| Launch a waitlist (email capture) on the landing page | **High** | Quick |
| Create Instagram + TikTok accounts (webtoon audience is visual/short-form) | **High** | Quick |
| Publish a concept teaser video (scenario → coherent episode in seconds) | **High** | Medium |
| Prepare a Product Hunt launch kit (assets, copy, first-comment) | **Medium** | Medium |
| Seed in webtoon/AI-art creator communities (Reddit, Discord) addressing "character drift" pain directly | **Medium** | Medium |
| Build a public gallery of DreamWeave-made episodes as social proof | **Medium** | Long |
| Short-form "make a webtoon in X minutes" series for TikTok/Reels/Shorts | **Medium** | Long |
| SEO content targeting "AI webtoon generator / character consistency" (the field's top search intent) | **Low** | Long |
| Creator referral/credit-bonus loop (fits the credit-based model) | **Low** | Medium |

---

## TL;DR
- **Tech is launch-grade where it counts:** disciplined typing (0 `any`/`ts-ignore`), correct server-side auth + quota + ownership checks, signature-verified Stripe webhook, no leaked service-role. Scores: code 8.0 / arch 8.5 / perf 7.0 / security 8.5 / debt 7.5.
- **Two concentrated debts to clear before launch:** thin automated test coverage (4 tests / ~170 files) on money + quota + canvas paths, and 4–5 god-components (2,000–2,500 LOC) carrying core flows.
- **Competitive gap is distribution, not quality** — DreamWeave already runs the frontier model (FLUX.2 Pro) and the right consistency primitive (Sheet System); rivals (Webtoon, Dashtoon, Jenova) win on publish/monetize loops and speed-to-episode.
- **Marketing's untold story is "no character drift"** — the loudest community pain point maps exactly to the Sheet System differentiator; lead with it on a waitlist landing page.
- **Source caveat:** §1 found almost no comic-AI coverage strictly inside the 30-day window; findings are flagged by date and used as directional context, not compliant evidence.

> ⚠️ Source-dating compliance was not fully met this run — the live web surfaced evergreen/older pages rather than current-month (17 May–17 June 2026) reporting on this niche. Treat §1 as directional.
