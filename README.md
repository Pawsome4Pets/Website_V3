# Pawsome 4 Pets 🐾

Production-ready luxury website for **Pawsome 4 Pets — Dog Hotel & Spa (PTY) LTD**,
a kennel-free dog hotel for small and toy-breed dogs in Centurion, Gauteng.

Built with React + Vite, Tailwind CSS and Framer Motion.

## ✨ Features
- **7 pages:** Home, About, Services, Boarding Info, Team, Gallery, Contact
- **Boarding Info** combines Policies, Vaccination Requirements, What to Bring and FAQ with a sticky sub-nav
- **External booking flow** — "Book a Stay" → KennelBooker portal; "New Client Application" → Cognito form
- Luxury aesthetic — cream / beige / charcoal / muted-gold, Fraunces + Manrope typography
- Glassmorphism navbar, scroll reveals, page transitions, floating WhatsApp button
- Masonry gallery with category filter + keyboard-friendly lightbox
- **SEO ready:** per-page meta + Open Graph + Twitter cards, JSON-LD LocalBusiness schema, `robots.txt`, `sitemap.xml`
- **Performance:** route-level code splitting (React.lazy), lazy-loaded images, lightweight motion

## 🚀 Setup

```bash
npm install            # install frontend dependencies
npm run server:install # install backend dependencies
npm run dev            # start frontend + backend together
npm run build          # production build → /dist
npm run preview        # preview the production build
```

The site runs immediately after `npm install` — elegant placeholder graphics
show until you add real photos.

## 🗄 Backend & database (Phase 1)

A Node + Express + Prisma backend lives in `server/`. It powers authentication
and (in upcoming phases) the dynamic form builder, admin dashboard, and
submission management.

**One-time setup:**

```bash
cp server/.env.example server/.env    # then edit DATABASE_URL, JWT_SECRET, ADMIN_*
npm run server:migrate                 # apply Prisma migrations to MySQL
npm run server:seed                    # create default roles, permissions, admin
```

The schema matches the build plan: `users`, `admin_users`, `roles`,
`permissions`, `forms`, `form_fields`, `field_conditions`, `form_submissions`,
`submission_answers`, `file_uploads`, `activity_logs`, `settings`. Open it in
HeidiSQL once migrations have run.

**API endpoints**

| Group | Method | Path                                  | Purpose                                              |
| ----- | ------ | ------------------------------------- | ---------------------------------------------------- |
| Auth  | POST   | `/api/auth/register`                  | Register a regular user (returns JWT)                |
| Auth  | POST   | `/api/auth/login`                     | Log in (user or admin) → JWT                         |
| Auth  | GET    | `/api/auth/me`                        | Current account from `Authorization` bearer         |
| Auth  | POST   | `/api/auth/logout`                    | Record activity; client drops token                  |
| Public| GET    | `/api/forms/:slug`                    | Public form schema (only if published)               |
| Public| POST   | `/api/forms/:slug/submit`             | Submit a form (auto-creates account if configured)   |
| Upload| POST   | `/api/uploads`                        | Multipart upload (allowlisted MIME, 10 MB cap)       |
| Upload| GET    | `/api/uploads/:id`                    | Download a stored file                               |
| Admin | GET    | `/api/admin/stats`                    | Counts + recent submissions                          |
| Admin | GET/PATCH| `/api/admin/users[/:id]`            | List + update users                                  |
| Admin | GET    | `/api/admin/activity`                 | Audit log feed                                       |
| Admin | GET/PUT| `/api/admin/settings[/:key]`          | Key-value settings                                   |
| Admin | GET    | `/api/admin/roles`                    | Role + permission introspection                      |
| Admin | CRUD   | `/api/admin/forms`                    | Create/list/edit/delete forms                        |
| Admin | PUT    | `/api/admin/forms/:id/fields`         | Bulk-save fields (used by drag-and-drop builder)     |
| Admin | CRUD   | `/api/admin/submissions[/:id]`        | List/view/status/delete submissions                  |
| Export| GET    | `/api/exports/forms/:id/submissions.csv` | CSV export of all submissions for a form          |
| Export| GET    | `/api/exports/submissions/:id.pdf`    | Single-submission PDF                                |

All admin endpoints require an admin JWT. All routes are protected by helmet,
CORS, global rate limits, and per-route limits on auth, submit, and uploads.

**Frontend routes**

Public: `/`, `/about`, `/services`, `/info`, `/team`, `/contact`,
`/login`, `/register`, `/forms/:slug`, `/account` (auth required).
Admin (admin role required): `/admin`, `/admin/forms`, `/admin/forms/:id`,
`/admin/submissions`, `/admin/submissions/:id`, `/admin/users`,
`/admin/activity`, `/admin/settings`.

## 🛠 Form Builder (Phases 1–7)

What ships in this codebase:

- **Phase 1 — Auth + DB:** JWT auth (user + admin), bcrypt hashing, 12-table
  Prisma schema, default roles + permissions + admin seeded from `.env`.
- **Phase 2 — Admin dashboard:** sidebar/topbar SaaS shell, stat cards, recent
  activity, forms list, users list, audit log, settings page.
- **Phase 3 — Dynamic form rendering:** `/forms/:slug` renders any published
  form from schema. Conditional logic engine (show/hide/require) drives field
  visibility client-side.
- **Phase 4 — Drag-and-drop builder:** [`/admin/forms/:id`](src/pages/admin/AdminFormEditor.jsx)
  with `@dnd-kit` reordering, 12 field types, options editor, conditional logic
  editor, live preview, publish/unpublish toggle.
- **Phase 5 — Submissions:** Public submit endpoint stores submission + answers,
  optional auto-account creation with temporary password, admin viewer with
  status workflow (submitted → reviewed → archived).
- **Phase 6 — Files + exports:** Multer-backed uploads, CSV export per form,
  per-submission PDF rendered with `pdfkit`.
- **Phase 7 — Hardening:** helmet, CORS allowlist, body-size limits, tight
  per-route rate limits (login, register, submit, upload), Prisma parameterised
  queries (no raw SQL), bearer-token auth (CSRF-immune), MIME allowlist on
  uploads, path-traversal check on file download.

## 🖼 Adding your photos
Drop images into `public/assets/images/` using the filenames listed in
`public/assets/images/README.md`. Placeholders disappear automatically.

## ✏️ Editing content
All copy, contact details, services, team, testimonials, gallery, policies,
vaccinations, what-to-bring and FAQ live in **one file**:
`src/data/content.js`. Edit there and it updates site-wide.

## 🔗 External links
Set in `src/data/content.js` under `externalLinks`:
- **booking** → KennelBooker existing-client portal
- **newClient** → Cognito Forms new-client application

## 📁 Structure
```
pawsome4pets/
├─ index.html              # base meta + LocalBusiness JSON-LD
├─ package.json
├─ tailwind.config.js      # palette, fonts, animations
├─ vite.config.js
├─ postcss.config.js
├─ public/
│  ├─ robots.txt
│  ├─ sitemap.xml
│  └─ assets/images/       # your photos + favicon
└─ src/
   ├─ main.jsx             # entry (Router + Helmet providers)
   ├─ App.jsx              # layout, lazy routes, page transitions
   ├─ index.css            # Tailwind layers + utility classes
   ├─ data/content.js      # ← single source of truth
   ├─ components/
   │  ├─ Navbar / Footer / WhatsAppButton
   │  ├─ Button / Field / Icon / SEO / Accordion
   │  ├─ Reveal / SectionHeading / PageHero
   │  ├─ ServiceCard / TeamCard
   │  ├─ GalleryGrid (masonry + lightbox)
   │  └─ PlaceholderImg
   └─ pages/
      ├─ Home, About, Services
      ├─ Info             # Policies + Vaccinations + What to Bring + FAQ
      ├─ Team, Gallery, Contact
```

---
© Pawsome 4 Pets (PTY) LTD. Crafted with care for happy dogs.
