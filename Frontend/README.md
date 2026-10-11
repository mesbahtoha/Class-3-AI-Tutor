# Frontend — API Test Console (testing only)

Minimal static page to exercise every backend endpoint. No build step, no npm.
You will replace this with the real frontend later.

## Run

The backend must be running first:

```bash
cd Backend
npm run dev   # http://localhost:5000
```

Then serve this folder (opening `index.html` via `file://` breaks Firebase
Google popups and may trip CORS — use a local server):

```bash
cd Frontend
npx serve . -l 3000
# or: python -m http.server 3000
```

Open http://localhost:3000. The console defaults to backend
`http://localhost:5000` + `/api/v1` (changeable in section 0).

## Test order (recommended)

1. **§0** — `GET /health`, `GET /ready` (expect `database: ok`), `/docs`.
2. **§2** — Create guest session → chat in **§3** works immediately
   (text-only, 10/day). No books published yet → expect
   `INSUFFICIENT_BOOK_CONTEXT` (correct behavior, not an error).
3. **§1** — Google or email sign-in (Firebase project `class-3-ai-tutor`),
   then `GET /me` (first sign-in auto-creates your GUARDIAN record).
   Your Super Admin account (`mesbahulalam017@gmail.com`) unlocks **§10**.
4. **§4–§9** — child profiles, catalogue, lesson/quiz, conversations,
   media uploads, feedback, progress.
5. **§10 (admin)** — upload a Class 3 PDF → note the `book.id` (auto-filled)
   → Get (status `READY_TO_PUBLISH`) → Preview → Publish → ask in **§3**
   with that `bookId` → expect `ANSWERED` + real page citations.

## Notes

- Auth header priority follows the **Auth mode** selector
  (`auto` = Firebase token if signed in, else guest token).
- `Backend/.env` Firebase web `apiKey` in `app.js` is public-by-design
  (browser key with domain restrictions); real secrets stay server-side.
- Quiz creation never returns the answer key; answering happens via
  `POST /tutor/quiz/:id/attempts` which returns score + supportive feedback.
