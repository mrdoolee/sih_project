# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

과학 탐구 활동 보고서 작성 도우미 (Science Inquiry Lab Report Helper) — a Korean-language React app for middle/high school science classes. Students record measurements, draw trend lines by hand and compare against auto-regression, and write a structured lab report; teachers configure topics/groups, distribute access via QR/link, and grade submissions against a 5-item rubric. Originally scaffolded from a Google AI Studio template (see `metadata.json`) but no longer uses that template's Gemini API or Express server pieces — see "Unused scaffold leftovers" below.

## Commands

```bash
npm run dev      # vite dev server (host 0.0.0.0; port from $PORT env, else 3000)
npm run build    # vite build — builds BOTH index.html and teacher.html entries
npm run preview  # preview the production build
npm run lint      # tsc --noEmit — this is the only "lint" there is, no eslint
```

There is no test suite/runner configured in this repo — do not assume `npm test` exists.

`npm run build` is a multi-entry Vite build (`vite.config.ts` sets `build.rollupOptions.input` to both `index.html` and `teacher.html`); a single-entry mental model will miss the second bundle.

## Architecture

### Two HTML entry points, one shared component tree

- `index.html` → `src/main.tsx` → `App.tsx`. This is the main app. `App.tsx` decides at mount whether to render the **student** flow or the **teacher** dashboard based on URL params/hash (`?mode=student`, `?page=teacher`, `#student`, presence of `?topic=`/`?group=`, etc. — see the `currentPage` state initializer near the top of `App.tsx`). Default with no params is the teacher console.
- `teacher.html` → `src/teacher.tsx`. A second, standalone mount point that renders only `TeacherDashboard` directly (no student flow, no routing logic). Both entries import the *same* `TeacherDashboard` component — don't fork teacher logic into `teacher.tsx`; it's meant to stay a thin wrapper.

### No real backend — Google Apps Script (GAS) is the whole server

There is no Node/Express server (despite `express` being in `package.json` — see below). The persistence layer is:

```
Browser (React) --fetch--> Google Apps Script Web App (/exec) --SpreadsheetApp--> the teacher's own Google Sheet
```

Everything server-side lives in **one file**: `src/utils/gasService.ts`.
- The top ~800 lines are client-side functions: `getStored*`/`saveStored*` (localStorage) and `fetch*FromGAS`/`save*ToGAS` (network calls to the deployed web app).
- `getGASCodeTemplate()` (line ~803 onward) returns the **entire Apps Script server** as a big template string. The teacher copies this into the Apps Script editor and deploys it themselves as a Web App ("Execute as: me", "Who has access: Anyone"). Because the teacher does the OAuth consent once at deploy time, no client ever needs OAuth — the deployed script simply runs with the teacher's own Drive permissions. `SpreadsheetApp.getActiveSpreadsheet()` is container-bound, so there's no spreadsheet ID anywhere in the code.
- **The client/server contract is duplicated by hand**: sheet column layout, action names, and payload shapes are hardcoded both in the TS client functions and inside the `getGASCodeTemplate()` string. Changing anything that touches the sheet schema (report question count, rubric fields, a new settings toggle, a new data tab) means editing both halves *and* every teacher has to re-copy/redeploy their Apps Script. `docs/GAS_SHIM_DESIGN.md` is a (currently unimplemented) design proposal for making the GAS side schema-agnostic — don't assume that refactor has happened; the template is still schema-coupled today.
- CORS forces POST bodies to use `Content-Type: text/plain;charset=utf-8` instead of `application/json`, because GAS can't handle a CORS preflight and `/exec` 302-redirects to `script.googleusercontent.com`. Keep this when adding new POST actions.
- Auth: the client-side teacher password check (`TeacherAuthModal`) is UX only. Real enforcement is server-side in the GAS template via `PROTECTED_ACTIONS` + `isAuthorizedTeacherRequest()`, which compares a request's `authPassword` against the password stored in the `환경설정` sheet tab. Protected actions: `saveSettings`, `saveAllGroupPasswords`, `saveGroupPassword`, `resetGroupPassword`, `saveTopics`, `saveEvaluation`. `saveGroupData` (students submitting measurements) is deliberately **not** in that list — students must be able to submit without a teacher password.
- `sanitizeCell()` in the template guards against spreadsheet formula injection on free-text fields. Any password-bearing column write must go through `setNumberFormat('@')` before `setValue()` — Sheets will otherwise auto-coerce a numeric-looking password like `"0000"` into the number `0`, silently truncating leading zeros. `appendRow()` does not respect a column's pre-set format, so this has to be re-applied after every `appendRow` on a password column, not just once at sheet-creation time.
- Everything works with `gasConfig.webAppUrl` unset — all `getStored*`/`saveStored*` functions round-trip through `localStorage` first, and the `fetch*FromGAS`/`save*ToGAS` calls are best-effort sync layered on top. Don't assume a live GAS connection when reasoning about app behavior.

### Unused scaffold leftovers

`package.json` lists `express` and `@google/genai` as dependencies, and `.env.example` documents a `GEMINI_API_KEY`. None of this is imported or used anywhere in `src/`. These are inherited from the original AI Studio scaffold (`metadata.json` still declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`). Don't build on the assumption that a Gemini API call or an Express server exists — they don't.

### Core data model (`src/types.ts`)

- `TopicConfig` — one science experiment topic (X/Y variable names+units, default trendline, target grades/classes/groups). Report questions are dynamic: `reportQuestions?: ReportQuestionConfig[]` overrides the fixed 3-question default; always read questions through `getEffectiveReportQuestions(topic)`, never assume exactly 3.
- `GroupExperimentData` — one group's submission: `points` (measurements), `manualGraphData` (student's hand-drawn trend line/curve state), `conclusionNotes.answers` (dynamic question-id → answer map, parallel to `reportQuestions`).
- `GroupEvaluation` — teacher grading: free-text score/feedback plus a fixed 5-item `rubricScores` (accuracy, graphInterpretation, scientificReasoning, errorAnalysis, attitude), each 1–5.

### Analysis and rendering utilities

- `src/utils/mathAnalysis.ts` — pure regression functions per trendline type (`calculateLinear`, `calculateProportional`, `calculateInverse`, `calculateQuadratic`) dispatched via `computeTrendline(type, points)`, plus `generateScientificInsight()` for the auto-generated interpretation text. No side effects, safe to unit-test in isolation if you add a test runner.
- `src/utils/distributionHelper.ts` — encodes/decodes the student-facing distribution link (topic/grade/class/GAS URL packed into query params) used by the QR/link sharing flow.
- `src/components/ManualGraphCanvas.tsx` — the student's hand-drawn graphing canvas (point-plot / straight-line / quadratic-curve / freehand modes). Has had real infinite-render-loop bugs before from recreating objects referenced by effect dependencies each render — if you touch this file's `useEffect`/`useCallback` deps, verify in a browser, not just via `tsc`.
- `src/components/TeacherDashboard.tsx` is large (3000+ lines) and holds all six teacher console tabs (GAS 연동, 기능제어/환경설정, 탐구주제/모둠관리, 학생 배부 링크 & QR, 전체 모둠 탐구 결과 확인, 모둠별 탐구 결과 확인 & 평가) in one component tree — search within the file for the relevant tab's JSX rather than assuming feature-based file boundaries.

### Path alias

`tsconfig.json` and `vite.config.ts` both define `@/*` → project root.
