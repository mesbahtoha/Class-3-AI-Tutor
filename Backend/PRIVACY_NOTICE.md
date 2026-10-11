# Privacy Notice (template — review with counsel before public launch; Bangladesh law applies)

> This is an engineering template, not legal advice (spec §13.4). Publish the finalized version on your website and keep it updated when providers change.

## What we collect and why

- **Account:** Firebase UID + email (if provided) to sign you in; role for authorization.
- **Child profiles (guardian-owned):** nickname, grade, curriculum, language preference. We do **not** require full legal name, birth date, school, address, contacts, or face photos.
- **Learning content:** questions, transcripts (per settings), answers + citations, quiz attempts, progress summaries — to tutor and show progress.
- **Guest mode:** temporary session + messages only, auto-expires (`GUEST_SESSION_TTL_HOURS`). No permanent profile.
- **Uploads:** learner images/audio are private, temporary (`TEMP_UPLOAD_TTL_HOURS`), never added to official books automatically. Raw audio is not retained by default.
- **Operational:** request IDs, latency, provider/model, token estimates, error codes, admin audit trail. Secrets and full sensitive content are not logged.

## Third parties

Authentication (Google Firebase), hosting/database (Neon), storage (S3-compatible), AI/embedding/OCR/STT/TTS providers as configured in `Admin → AI config`. Only the minimum text needed for the feature is sent; unrelated history and account identifiers are withheld where possible.

## Retention & deletion

Guest data expires automatically. Learner media expires per TTL. Guardians can request access/deletion: in-app delete (conversation, child profile) + support contact. Backups age out per provider policy.

## Children & consent

Accounts are guardian-managed. No targeted advertising in MVP. Learners can report unhelpful/inappropriate answers (`POST /feedback`). Safety reviews may inspect flagged content under tight access controls.

## Provider changes

Switching AI providers (e.g. OpenRouter → Claude) changes which sub-processor receives prompts. The privacy notice + DPA register must be updated before switching production traffic.
