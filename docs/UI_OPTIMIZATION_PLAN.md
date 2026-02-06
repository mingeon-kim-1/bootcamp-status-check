# UI Optimization Plan: Admin & Student

Optimizations for the current UI plus the planned features (help queue, break mode, public display) so both admin and students have a clear, consistent, and mobile-friendly experience.

---

## 1. Consistency and i18n

**Current issues:** Attendance codes, announcement, and student login use hardcoded Korean ("출석 코드", "공지사항", "좌석을 선택해주세요", etc.). Settings modal uses "Settings", "Theme", "Language" in English only.

**Changes:**
- Add translation keys for all user-facing strings in [src/messages/en.json](src/messages/en.json), [ko.json](src/messages/ko.json), [zh.json](src/messages/zh.json):
  - `admin.attendanceCodes`, `admin.attendanceMorning`, `admin.attendanceAfternoon`, `admin.attendanceHint`, `admin.saveCodes`
  - `admin.announcement`, `admin.announcementContent`, `admin.announcementPlaceholder`, `admin.announcementVisible`, `admin.announcementHidden`, `admin.saveAnnouncement`
  - `admin.breakMode`, `admin.breakModeOn`, `admin.breakModeOff`
  - `student.selectSeat`, `student.enterCode`, `student.codePlaceholder`, `student.codeInvalid`, `student.attendanceComplete`
  - `display.helpQueue`, `display.breakMessage`, `display.waitingMinutes`
- Use `t(...)` everywhere in admin dashboard, student login, student dashboard, and SettingsModal so language switcher affects the whole app.

---

## 2. Admin experience

### 2.1 Dashboard (config page)

**Current:** Single long page with Config, Attendance codes, Announcement, Student table. "Config" nav is highlighted but the page title is "Admin Dashboard"; the active section is not obvious.

**Optimizations:**
- **Page title:** Show "Configuration" (or `t('admin.config')`) as the main heading when on the config tab so it matches the nav label.
- **Break mode (new feature):** Add a prominent "Break mode" control:
  - Place it at the top of the config section or in its own short row (e.g. a toggle with label "Break mode — display shows pause message").
  - Use the same visual style as the announcement toggle (switch + label). On change, call `PUT /api/admin/config` with `breakMode`.
- **Sectioning:** Add subtle section headings or cards so "Configuration", "Attendance codes", "Announcement", "Student management" are visually grouped. Optional: collapsible sections for "Attendance" and "Announcement" so the page is scannable.
- **Quick link to display:** In the nav or under the title, add a short line: "Share display: [Copy link]" that copies the public view URL (e.g. `origin/ko/view?token=...`) when env is set, or "Open display" that links to `/[locale]/admin/display`. This supports the new public display feature.

### 2.2 Navigation

**Current:** Four links — Config, Seats, Student Management, Display. Config and Display use different colors (indigo vs emerald); "Display" is the main action for class time.

**Optimizations:**
- Treat **Display** as the primary action: use a stronger style (e.g. primary button or "Display" first in order) and optionally show a small "Live" dot when the display is open elsewhere.
- Add a **Public view** item or tooltip: e.g. "Display (public link)" with a copy-icon that copies `/{locale}/view?token=...` so instructors can paste it into a projector browser without logging in.
- Breadcrumb or sub-label: e.g. "Dashboard → Configuration" so admins always know where they are.

### 2.3 Display page (and shared StatusDisplayContent)

**Current:** Header (back, title, settings, fullscreen), front-of-room label, three count badges, grid, back-of-room label. No help order, no break state.

**Optimizations (including new features):**
- **Help queue (new):** Below the three count badges, when `counts.needHelp > 0`, show one line: "Help queue: Seat 3 (2m), Seat 7 (5m)" (oldest first). Use `display.helpQueue` and format wait time in minutes. Style: same row as counts, smaller text, so instructors see order at a glance.
- **Break mode (new):** When `config.breakMode` is true, replace the grid and counts with a single full-screen message (e.g. "Break — we'll resume shortly") using `display.breakMessage`. Keep header (and optional "Break mode: ON" badge). Keep polling so when break ends, the grid returns without refresh.
- **Public view:** When the page is used as the public view (no back button), show only: title, fullscreen, and the same summary + help queue + break/grid. No Settings or Language in fullscreen if desired; optionally keep them in non-fullscreen for projectors that need language switch.
- **Mobile:** On small screens, make the count badges wrap and the help queue line truncate or scroll horizontally so the grid remains usable.
- **Accessibility:** Ensure summary and help queue have proper labels (e.g. `aria-label` or role) for screen readers; keep color + text (e.g. "Need help: 3") so it’s not color-only.

### 2.4 Students management page

**Current:** Table with seat, status, actions (Mark ready, Reset). Works but is dense.

**Optimizations:**
- **Help queue column (when feature exists):** Add optional column "Waiting" (e.g. "2m") for need-help rows, sorted by `needHelpSince` so the list order matches the display help queue.
- **Filters:** Optional quick filters: "All | Ready | Need help | Absent" so admins can focus on need-help first.
- **Empty state:** When there are no students, show a short message and a hint: "Students will appear after they log in with seat number and attendance code."

---

## 3. Student experience

### 3.1 Student login

**Current:** Seat grid (many small buttons), 4-digit code input, submit. Error messages in Korean. No hint where to get the code.

**Optimizations:**
- **Copy:** Replace all hardcoded Korean with i18n: "Select your seat", "Enter the 4-digit code from your instructor", "Please select a seat", "Enter a 4-digit code", "Code is invalid or expired."
- **Layout:** On mobile, reduce seat grid height (e.g. max height with scroll) so the code input stays visible; consider slightly larger tap targets for seats.
- **Code input:** Keep numeric-only and max length 4; add a short hint under the field: "Get the code from your instructor or the screen."
- **Feedback:** On success, optional brief "Redirecting..." or a spinner on the button so students know the click registered before the redirect.

### 3.2 Student dashboard

**Current:** Seat number large, "Attendance complete" badge, announcement (collapsible), current status (Ready / Need help), one big action button (Request help or Mark ready). Some Korean ("출석 완료", "공지사항").

**Optimizations:**
- **i18n:** Use translations for "Attendance complete", "Announcement", and any other hardcoded strings.
- **Hierarchy:** Keep seat number as the main identifier; keep the single primary action (Request help / Mark ready) as the main button. Ensure the current status (Ready vs Need help) is obvious at a glance (current color + label is good).
- **Announcement:** Keep the expand/collapse behavior; ensure the announcement title and body use `t()`. If no announcement is active, don’t leave an empty box; the current transition (max-h-0 when inactive) is good.
- **Reassurance when need-help:** When status is "Need help", keep the existing message ("Help has been requested. Please wait."); optionally add a short line: "You’re in the queue. The instructor will come to your seat."
- **Logout:** Keep logout in the header but consider a softer style (e.g. text link "Leave" or "Log out") so the main focus stays on the status button. Ensure it’s still visible on mobile.

---

## 4. Public display view (new)

**Goal:** Same content as admin display (counts, help queue, break or grid) but without login, optional token.

**Optimizations:**
- **Minimal chrome:** No back to dashboard, no settings in fullscreen. Show: display title, fullscreen button, and the shared StatusDisplayContent (counts, help queue, break message or grid). Optional: small "View only" or lock icon so it’s clear this isn’t the admin view.
- **Token error:** If token is missing or wrong, show a simple message (e.g. "Invalid or expired link") and a link to the home page; use i18n if the view is locale-aware.
- **Mobile:** Same as admin display: responsive counts and help queue so the grid is still usable on small screens (e.g. for a tablet at the front).

---

## 5. Cross-cutting

- **Loading states:** Use the same pattern everywhere: spinner or "Loading..." with `t('common.loading')`, and disable buttons while saving (already done in most places).
- **Save feedback:** After saving config, attendance codes, or announcement, show a short success toast or inline "Saved" (e.g. 2s then fade) so admins know the action succeeded.
- **Errors:** On API errors, show a short inline or toast message (e.g. "Something went wrong. Try again.") with `t('common.error')` or a dedicated key; avoid silent failures.
- **Touch targets:** Ensure buttons and toggles are at least ~44px for touch on student login (seat buttons, submit) and on mobile admin (nav, display fullscreen).

---

## 6. Summary by area

| Area | Optimizations |
|------|----------------|
| **i18n** | Add keys for attendance, announcement, break mode, student login/dashboard, display (help queue, break message); use `t()` everywhere. |
| **Admin dashboard** | Break mode toggle; sectioning/cards; copy public display link; optional collapsible sections. |
| **Admin nav** | Display as primary; public view copy link; clear active state / breadcrumb. |
| **Display (admin + public)** | Help queue row; break mode full-screen message; minimal public chrome; mobile-friendly counts/help queue; a11y. |
| **Admin students** | Optional "Waiting" column and filters; better empty state. |
| **Student login** | Full i18n; hint for code; mobile-friendly seat grid; clear errors. |
| **Student dashboard** | Full i18n; optional "You’re in the queue" when need-help; softer logout. |
| **Global** | Success/error feedback; consistent loading; touch-friendly targets. |

Implementing these will make the app consistent, translatable, and easier to use for both admins (especially with help queue, break mode, and public display) and students, including on mobile and in multi-language use.
