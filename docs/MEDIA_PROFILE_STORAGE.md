# Diong Media / Profile Storage — Pass 7

Pass 7 adds Supabase Storage-backed images to three existing surfaces: the
profile (**avatar**, **cover**), posts (**up to 4 images**), and communities
(**avatar**, **cover**). It does **not** add a new route, a new content type,
or video. It does not change any earlier pass's schema, RLS, or RPCs beyond
the additive column/table additions and the trailing-column RPC
recreations described below.

**Status: applied.** `supabase/migrations/202609130002_media_profile_polish.sql`
has been applied to the production Supabase project and verified — every
behaviour described below is live.

## Migration to run

Apply in order against the target Supabase project, after every earlier
migration (see `README.md` for the full ordered list):

14. `supabase/migrations/202609130002_media_profile_polish.sql`

It depends on `public.profiles` / `public.posts` / `public.communities` /
`public.blocks` (earlier passes) and `public.viewer_can_see_post` /
`public.blocked_between` / `public.community_role` (202609100003 /
202609120003). It is a single `begin … commit` transaction and is **not**
idempotent — never re-run a migration that already succeeded. Nothing in it
alters an existing table's pre-existing columns, an existing migration file,
or any pre-existing RLS policy or RPC's argument list.

With the Supabase CLI linked:

```bash
supabase db push
```

Or paste the whole file once into the SQL Editor, confirm the project, run
it, and record the filename + date in the deployment log.

No new environment variables. **No service-role key is used anywhere in this
pass** — every upload goes browser → Storage using the same publishable
("anon") key the rest of the app already uses, gated by Storage RLS.

## Architecture overview

Three ideas run through every media feature in this pass:

1. **The browser uploads directly to Storage.** A Server Action never
   receives or proxies image bytes — `uploadToStorage()`
   (`src/lib/media/upload-to-storage.ts`) calls
   `supabase.storage.from('diong-public-media').upload(path, file)` from the
   client, using the browser's own authenticated Supabase client. Storage RLS
   (below) is what stops a caller from writing anywhere except their own
   namespace; the bucket's own `allowed_mime_types` / `file_size_limit`
   provide an outer floor.
2. **Only a relative `storage_path` is ever persisted.** Every database
   column that names an image (`profiles.avatar_path`, `profiles.cover_path`,
   `communities.avatar_path`, `communities.cover_path`,
   `post_media.storage_path`) stores a path like
   `profiles/<uuid>/avatar/<uuid>.png` — never a full URL. The public URL is
   reconstructed at render time by `getPublicMediaUrl()`
   (`src/lib/media/media-url.ts`), which does pure string concatenation
   against `NEXT_PUBLIC_SUPABASE_URL` (no network call, no auth) — the same
   approach `supabase-js`'s own `getPublicUrl()` uses internally. This keeps
   the app portable across Supabase projects/environments without a
   migration, and keeps the DB from ever needing to know the current project
   URL.
3. **Every write is re-validated server-side, twice.** A Server Action
   validates the storage path's ownership prefix and the object's actual
   Storage-recorded size before persisting; the underlying database write
   (a direct `update` for the two profile columns, or a `SECURITY DEFINER`
   RPC for post media and community media) re-validates ownership again,
   independent of what the Server Action already checked. Client-side
   validation (`validateImageFile`, `validatePostImageCount`,
   `validateAltText`) exists purely for fast UX feedback — none of it is
   trusted.

## The `diong-public-media` bucket

One bucket serves all three features:

| Setting | Value |
| --- | --- |
| `id` / `name` | `diong-public-media` |
| `public` | `true` |
| `file_size_limit` | `6291456` (6 MiB) — the bucket-level ceiling |
| `allowed_mime_types` | `image/jpeg`, `image/png`, `image/webp` |

The bucket's 6 MiB ceiling is the **outer bound only** — it matches the
largest per-context limit (post images). Avatar (3 MB) and cover (5 MB)
limits are enforced above that, in the application layer
(`MEDIA_CONTEXT_MAX_BYTES` in `src/lib/media/media-constants.ts`, checked
both client-side for UX and server-side against the object's actual
Storage-recorded size in `verifyUploadedImageSize()`) — profiles and
communities carry no `size_bytes` column the way `post_media` does, so there
is nowhere in the schema to put a per-row CHECK for those two contexts.

### Public-media privacy boundary — read this before using the bucket for anything else

`diong-public-media` is public-read **by design**, for **intentionally
public/social media only** — profile avatars/covers, post images, community
branding. It must never be used to store anything that should be
access-controlled (a private journal attachment, a DM image, a private-post
image), because:

- **A public Storage URL is not a privacy boundary.** Once a client has
  fetched a direct object URL, that URL remains technically retrievable by
  anyone who has it, indefinitely — Storage does not know or enforce Diong's
  application-level visibility rules.
- **Blocking does not revoke access to a URL someone already has.** If user A
  blocks user B after B has already loaded (and could have saved) a direct
  image URL from one of A's posts, the block stops B from seeing that image
  *through the app* going forward — it does not, and cannot, invalidate the
  URL itself. The same is true for a post whose visibility narrows from
  `public` to `private`, or a post that is later soft-deleted while its
  Storage object has not yet been cleaned up.
- Filenames are unpredictable UUIDs precisely to make "public but
  unguessable" an acceptable V1 trade-off — **not** a guarantee of
  unlinkability. Nothing about this bucket should be described to users as
  private or access-controlled.

This is the same privacy note carried in the migration file's own header
comment (`202609130002_media_profile_polish.sql`); it is restated here as the
canonical, user-facing explanation.

## Path conventions

Every path is built by a pure helper in `src/lib/media/storage-paths.ts` and
always ends in a fresh `crypto.randomUUID()` filename — an upload is never an
in-place overwrite; a replacement always creates a new object under a new
name and only deletes the old one after the new path is durably persisted.

| Feature | Path shape | Builder |
| --- | --- | --- |
| Profile avatar | `profiles/{userId}/avatar/{uuid}.{ext}` | `buildAvatarPath` |
| Profile cover | `profiles/{userId}/cover/{uuid}.{ext}` | `buildCoverPath` |
| Post image | `posts/{userId}/{postId}/{uuid}.{ext}` | `buildPostMediaPath` |
| Community avatar | `communities/{ownerUserId}/{communityId}/avatar/{uuid}.{ext}` | `buildCommunityAvatarPath` |
| Community cover | `communities/{ownerUserId}/{communityId}/cover/{uuid}.{ext}` | `buildCommunityCoverPath` |

`{ext}` is `jpg` / `png` / `webp`, derived from the file's MIME type
(`extensionForMimeType`) — never taken from the original filename.

Every path's second segment is always the **uploader's own `auth.uid()`**
(for posts and profiles, the acting user; for communities, the community
*owner's* id, since only the owner may upload) — this is what
`public.media_path_owner_ok()` checks against `auth.uid()` at Storage-write
time, independent of anything else in the path.

## Formats, size limits, and counts

| Context | Formats | Max size | Notes |
| --- | --- | --- | --- |
| Profile avatar | JPEG / PNG / WEBP | 3 MB | One per profile. |
| Profile cover | JPEG / PNG / WEBP | 5 MB | One per profile. |
| Post image | JPEG / PNG / WEBP | 6 MB each | **0–4 per post.** |
| Community avatar | JPEG / PNG / WEBP | 3 MB | One per community, owner-only. |
| Community cover | JPEG / PNG / WEBP | 5 MB | One per community, owner-only. |

No GIF, SVG or video anywhere — the bucket's `allowed_mime_types` rejects
anything else outright, and every client-side picker's `accept` attribute
and `validateImageFile()` call agree with that list.

## Browser-to-Storage upload flow (all four features share this shape)

1. The user picks a file in a Client Component (`ImageUploadField` for
   avatar/cover, `PostImagePicker` for post images).
2. Client-side `validateImageFile()` checks MIME type and size against the
   context's limit — fast feedback only, never authoritative.
3. A destination path is built (`build*Path()`) from the *server-known*
   owner id already present in the page's props (never re-derived from
   anything the client could tamper with in a way that would matter — see
   Security below) plus a fresh UUID.
4. The browser uploads the file directly to
   `diong-public-media/<path>` via `uploadToStorage()`, using the
   already-authenticated browser Supabase client (publishable/anon key —
   **never** a service-role key). Storage RLS's `insert` policy
   (`Owners can upload to their own diong-public-media path`) is the gate: it
   calls `media_path_owner_ok(name)`, which re-parses the path itself and
   confirms `auth.uid()` owns the resource the path names.
5. Only once the upload itself succeeds does the client call a Server
   Action with the resulting `storagePath` — the action never sees file
   bytes, only the path string.

## Database persistence flow

Each Server Action (`updateAvatar`/`updateCover` in
`app/(protected)/settings/profile/actions.ts`,
`attachPostMediaAction` in `app/(protected)/posts/actions.ts`,
`updateCommunityAvatarAction`/`updateCommunityCoverAction` in
`app/(protected)/communities/[slug]/actions.ts`) does, in order:

1. Re-derive the acting user from `requireCompletedProfile()` (server-side
   session — never trusts a client-supplied user id).
2. Re-check the storage path's ownership prefix (`isOwnedPath()`) against
   that server-derived id.
3. Re-verify the *actual* Storage-recorded object size
   (`verifyUploadedImageSize()` — reads Storage's own `list()` metadata, not
   the client's claimed `File.size`) against the context's byte limit; a
   failing check deletes the just-uploaded object and returns a safe error.
4. Persist: a direct column `update` for the two profile columns (RLS-gated,
   `grant update (avatar_path, cover_path)` from the migration), or a
   `SECURITY DEFINER` RPC for post images (`attach_post_media`) and
   community branding (`set_community_avatar` / `set_community_cover`) — the
   RPC path exists because those writes need an authoritative server-side
   re-check (post ownership + 4-image ceiling; community ownership) that a
   plain RLS policy can't express as cleanly as PL/pgSQL can.
5. Only **after** that persistence step succeeds, best-effort delete the
   previous object (replacement) — see Replacement flow below.

## Replacement flow

Applies to profile avatar/cover, community avatar/cover, and (conceptually)
post images:

1. Upload the new object under a brand-new path.
2. Validate server-side (ownership prefix + actual size).
3. Persist the new path.
4. **Only after that DB write succeeds**, delete the previous object.

This ordering is deliberate: if step 4 ran before step 3, a failed DB write
would leave the user with **no** working image at all. As written, a failure
at step 3 (DB write) triggers cleanup of the *newly uploaded* orphan instead
(`safeDeleteObject` on the new path) and the old, still-referenced image is
left completely untouched — the existing working branding/avatar/cover is
never destroyed before a replacement durably succeeds.

## Removal flow

1. Read the current path (needed to know what to delete afterward).
2. Clear the DB column (`avatar_path`/`cover_path` → `null` for
   profile/community; delete the `post_media` row for a post image, via
   `remove_post_media()`, which returns the deleted row's `storage_path`).
3. Best-effort delete the Storage object (`safeDeleteObject()`).

`safeDeleteObject()` never throws and tolerates an already-missing object —
Storage's own `remove()` call is wrapped in a `try/catch`, and a "not found"
response from Storage is treated the same as a success, since the end state
(no object at that path) is identical either way. Every removal path returns
a plain, generic success/error message (`MediaActionResult`) — raw
Postgres/Storage error text is never surfaced to the UI.

## Cleanup / orphan risk

Two failure directions exist, both handled deliberately rather than
accidentally:

- **Upload succeeds, DB association fails.** The Server Action calls
  `safeDeleteObject()` on the just-uploaded path before returning its error,
  so the common case leaves no orphan. This cleanup call can itself fail
  silently (network blip, RLS edge case) — in that rare case a genuinely
  orphaned object remains in Storage, unreferenced by any row. It costs
  nothing functionally (nothing points at it, nothing renders it) and
  nothing security-sensitive (Storage RLS still gates who could have written
  it), just a small amount of unused space. No sweep/GC job exists yet — see
  Known limitations.
- **DB persistence succeeds, cleanup of the *old* object fails.** This is the
  replacement/removal tail step. If `safeDeleteObject()` on the old path
  fails, the **working post/profile/community is completely unaffected** —
  the new path is already live and rendering correctly. The old object
  becomes an orphan under the same terms as above: harmless, unreferenced,
  not cleaned up automatically. This trade-off — favouring "the user's
  content always works" over "storage is always tidy" — is intentional and
  documented here rather than solved with a fragile transactional-Storage
  scheme that doesn't exist in Supabase today.

## Row Level Security

### `post_media`

RLS enabled, `authenticated` has **`SELECT` only** (same revoke-first model
as every other Pass 2–6 table); there is **no** direct client
insert/update/delete grant at all — every write is RPC-only
(`attach_post_media` / `remove_post_media`, both `SECURITY DEFINER`, which
bypasses RLS/grants entirely by design, the same pattern `create_post` /
`follow_user` etc. already use).

| Policy | Rule |
| --- | --- |
| `Read media on visible posts` (`select`) | `public.viewer_can_see_post(post_id)` — identical visibility rule as the post itself. A blocked or otherwise-invisible post's images are exactly as invisible as its text. |

A `BEFORE INSERT OR UPDATE` trigger, `enforce_post_media_ownership()`,
additionally guarantees `post_media.user_id` always matches the owning
post's `user_id` no matter how a row is written — defence in depth on top of
`attach_post_media()`'s own explicit check, the same "composite ownership
never drifts" pattern used by `goal_milestones` / `habit_checkins` in Pass 6.

### `storage.objects` (bucket-scoped policies)

| Policy | Rule |
| --- | --- |
| `Public read for diong-public-media` (`select`, `public`) | `bucket_id = 'diong-public-media'` — unconditional, by design (see the privacy boundary section above). |
| `Owners can upload to their own diong-public-media path` (`insert`, `authenticated`) | `bucket_id = 'diong-public-media' and media_path_owner_ok(name)`. |
| `Owners can delete their own diong-public-media objects` (`delete`, `authenticated`) | Same ownership check. |

There is **no `update` policy** — every path ends in a fresh UUID filename,
so in-place overwrite is never part of any upload flow; a "replace" is
always a new insert + a separate delete of the old object.

### `public.media_path_owner_ok(p_name text)`

`SECURITY DEFINER`, `STABLE`, `SET search_path = ''`. Parses the object path
into its `/`-separated folder segments (`storage.foldername`) and returns
`true` only when the shape matches one of the three known conventions above
**and** `auth.uid()` owns the resource that shape implies:

- `profiles/{userId}/avatar|cover/…` — `userId` segment must equal
  `auth.uid()`.
- `posts/{userId}/{postId}/…` — `userId` segment must equal `auth.uid()`
  **and** that post must exist with `user_id = auth.uid()`.
- `communities/{ownerUserId}/{communityId}/avatar|cover/…` —
  `ownerUserId` segment must equal `auth.uid()` **and** that community must
  exist with `owner_id = auth.uid()`.

Any other shape, a null viewer, or a malformed numeric segment (checked with
a regex before casting to `bigint`, never raising) returns `false` rather
than erroring — a malformed path is quietly rejected, not a 500.

## Application-layer ownership checks

Storage RLS is the outer gate; three more independent checks exist above it,
none of which trust the browser:

1. **Server Action prefix check** (`isOwnedPath()`) — re-derives the
   expected path prefix from the *server-side* acting user (never a
   client-supplied id) and rejects anything that doesn't start with it,
   before any DB write is attempted.
2. **RPC re-check** — `attach_post_media()` re-verifies
   `posts.user_id = auth.uid()` for the target post; `set_community_avatar`
   / `set_community_cover` re-verify `communities.owner_id = auth.uid()`.
   Neither RPC trusts the `p_storage_path` prefix alone — the *database
   row's* ownership is the final word.
3. **UI gating** — the community branding controls
   (`CommunityMediaSettings`) render only when
   `community.viewerRole === "owner"`; a moderator or ordinary member never
   sees the upload controls in the first place. This is a UX convenience,
   not a security boundary — checks 1 and 2 hold even if this were bypassed.

**Community branding is owner-only, deliberately not extended to
moderators.** Nothing in the schema, RLS, RPC, or UI layer grants a
`moderator` role any branding capability — `community_role()` results other
than `'owner'` are never consulted by `set_community_avatar` /
`set_community_cover`, which check `owner_id` directly.

## Profile avatar / cover

- `profiles.avatar_path` / `profiles.cover_path` (both nullable `text`,
  added by this migration; `profiles.avatar_url` predates Pass 7, was never
  wired to an upload path, and is left untouched — a future pass may drop
  it).
- Managed from `/settings/profile` (`ProfileMediaSettings` →
  `ImageUploadField` ×2) — upload, live client-side preview
  (`URL.createObjectURL`), replace, remove.
- Rendered by the shared `Avatar` component (`src/components/media/avatar.tsx`)
  everywhere a user's identity appears: post cards, comments, notifications,
  conversation rows, community member lists, person/discover cards, and the
  public profile header itself. `Avatar` falls back to a calm initials
  circle (`getInitials()`) when `avatarPath` is null — never a broken image
  icon.
- The cover renders as a fixed-aspect banner (`aspect-[3/1]` /
  `sm:aspect-[4/1]`) behind the avatar on `/profile/[username]`.
- Both are surfaced through `get_social_profile()` — nulled out entirely
  (along with bio and counts) when the viewer is blocked by the profile
  owner, exactly like every other profile field in that block state.

## Post images

- `public.post_media` — up to 4 rows per post, each with `storage_path`,
  `mime_type`, `size_bytes`, optional `width`/`height`, `position` (display
  order), optional `alt_text` (≤300 chars).
- Composed in the post composer (`PostImagePicker`): stage 0–4 images with
  live preview and per-image removal *before* the post is even created, plus
  optional alt text per image.
- **Create-then-attach, not create-with-media.** `createPost` creates the
  text-only post first; only once a real `postId` exists does
  `PostImagePicker.attachAll()` upload and attach each staged image against
  that id. If an image fails to attach, the post itself still exists — the
  composer shows a warning naming how many images did not attach rather than
  losing the whole submission.
- Rendered by `PostMediaGrid` (1 image = large single frame, 2 = side by
  side, 3 = a tall image plus two stacked, 4 = an even 2×2 grid — never more
  than 4), invoked once inside `PostCard`, which every post-rendering
  surface already shares (see Display below) — no per-surface media code
  duplicated anywhere.
- **Editing an existing post can remove images (`PostMediaEditor`) but
  cannot add new ones.** This is a deliberate, documented V1 deferral —
  creating a post with images already covers the common case, and adding a
  second image-upload code path into the edit flow (with its own staging,
  count-against-existing-count validation, and partial-failure UX) would
  meaningfully widen this pass's surface for a case most posts don't need.
  Nothing about the schema or RLS blocks building it later.

## Community avatar / cover

- `communities.avatar_path` / `communities.cover_path` (nullable `text`).
  No client column grant exists — communities have had no direct client
  write grant at all since Pass 5 (`202609120003_communities.sql`); avatar
  and cover are written only through `set_community_avatar` /
  `set_community_cover`.
- Managed from `/communities/[slug]`, rendered only for the owner
  (`CommunityMediaSettings`) — same `ImageUploadField` component the profile
  page uses, with `context="community_avatar"` / `"community_cover"`.
- Rendered via the shared `Avatar` component on `/communities`,
  `/communities/[slug]` (avatar over a full-width cover banner, same
  fixed-aspect pattern as the profile page), Search results, and Discover
  results (all through `CommunityCard`, and `CommunityMembersList` for
  member rows) — one component, every surface.

## Display / rendering locations

| Surface | Avatar | Cover | Notes |
| --- | --- | --- | --- |
| `/settings/profile` | ✅ upload/replace/remove | ✅ upload/replace/remove | Owner-only by definition (own settings page). |
| `/profile/[username]` | ✅ | ✅ | Nulled entirely when the viewer is blocked. |
| `/feed`, `/posts/[id]`, `/saved`, `/discover`, `/search`, `/communities/[slug]` (post feed) | ✅ (post author) | — | All share `PostCard` → `Avatar` + `PostMediaGrid`. |
| `/communities`, `/communities/[slug]`, `/communities/[slug]/members`, Search, Discover | ✅ | ✅ (detail page only) | `CommunityCard` / `CommunityMembersList` / the detail page header. |
| Comments, notifications, conversation rows, person cards | ✅ | — | Every identity-bearing row in the app uses the same `Avatar` component. |

## Accessibility

- `Avatar` is `aria-hidden` in both states (image and initials fallback) —
  the adjacent name/username text is always the real accessible label,
  matching every existing identity-row pattern in the app (never a second,
  redundant label).
- Every upload control has a real `<label htmlFor>`, an `aria-describedby`
  linking help text + error + status regions, `role="alert"` for errors and
  `role="status"` for success — the same convention as every other Diong
  form.
- `PostMediaGrid`'s lightbox is a proper `role="dialog" aria-modal="true"`
  with `aria-label` from the image's alt text, focuses its close button on
  open, restores focus to the trigger on close, and closes on <kbd>Esc</kbd>.
- Each post image tile is a `<button>` with an `aria-label` built from its
  alt text (`"View image: <alt text>"` or a plain `"View image"` fallback) —
  never an unlabelled clickable `<img>`.
- Alt text is optional (matching the fact that most personal-development
  progress photos are decorative/contextual rather than needing a full
  description), capped at 300 characters, and passed straight through to
  the rendered `<Image alt=…>` — never dropped silently.

## Responsive behaviour (375px)

- Avatar/cover header layout (profile and community) follows one pattern:
  a fixed-aspect cover box (`aspect-[3/1]`, widening to `aspect-[4/1]` at
  `sm:`) that crops via `object-cover`, with the avatar overlapping it via a
  negative top margin and no fixed pixel width — nothing forces horizontal
  scroll at 375px.
- The name/role/Join-button row and the Members/Moderation/Report row both
  use `flex flex-wrap` with `gap`, so controls wrap to a second line rather
  than overflowing.
- `PostMediaGrid` is a CSS grid within the existing full-width post card
  (`gap-1.5`, no fixed widths) — the same 1/2/3/4-image layouts described
  above hold at any viewport width down to 375px.
- `ImageUploadField`'s preview + Upload/Replace/Remove controls sit in a
  `flex flex-wrap` row, so the buttons drop below the preview thumbnail on
  narrow screens instead of squeezing.

## Known limitations

- **No orphan-object sweep.** As described in Cleanup / orphan risk above, a
  rare cleanup-call failure leaves an unreferenced Storage object with no
  automated garbage collection. Not a correctness or security issue — purely
  unused space — and not built in this pass.
- **`attach_post_media()`'s position assignment is not explicitly locked.**
  `next_position := max(position) + 1` is computed and used within the same
  function call without an explicit row lock; two truly concurrent
  `attach_post_media` calls for the *same* post could theoretically compute
  the same next position and collide against the
  `post_media_post_position_unique` constraint. The failure mode is a safe,
  generic error on the losing call (mapped through the existing
  `MutationReason` classification) — never data corruption, never a security
  issue, and inherently rare (it requires the same user racing two uploads
  to the same post at the same instant). Left as-is rather than adding
  row-level locking for an edge case this narrow.
- **No post-edit "add image" flow.** Documented above under Post images —
  intentional V1 scope control, not an oversight.
- **No image resizing/transcoding/thumbnailing.** Whatever the browser
  uploads is what gets stored and served, at whatever dimensions the
  original file has. `width`/`height` are captured for `post_media` (read
  client-side before upload) purely as metadata; nothing resizes based on
  them.
- **The bucket-level 6 MiB `file_size_limit` is a ceiling, not a per-context
  enforcement mechanism** — see the bucket table above. Avatar/cover limits
  rely entirely on the application-layer check, since Supabase Storage
  buckets don't support the kind of per-request size limit that would need.

## Deferred media features

Confirmed out of scope for Pass 7, not designed against, may or may not
appear in a later pass:

- Video or GIF of any kind.
- Multiple images per profile/community (avatar/cover stay singular).
- More than 4 images per post.
- Image editing (crop/rotate/filter) in-app.
- A media library / "your uploads" browsing view.
- Automated Storage garbage collection for orphaned objects.
- Any access-controlled (non-public) media bucket — private post/DM/journal
  attachments are explicitly out of scope for `diong-public-media` and
  would need a separate, non-public bucket design if ever built.

## Application / domain layer

Framework-free code under `src/lib/media/`:

| File | Responsibility |
| --- | --- |
| `media-constants.ts` | `ALLOWED_IMAGE_MIME_TYPES`, per-context byte limits (`MEDIA_CONTEXT_MAX_BYTES`), `MAX_POST_IMAGES` (4), `ALT_TEXT_MAX_LENGTH` (300). |
| `media-validation.ts` | `validateImageFile`, `validateAltText`, `validatePostImageCount`, `validatePostMediaPosition`, `isAllowedImageMimeType` — pure, UX-only. |
| `storage-paths.ts` | `build*Path()` helpers (below) + `isOwnedPath()` prefix check. Pure, no I/O. |
| `storage-server.ts` | Server-only: `getUploadedObjectSize`, `verifyUploadedImageSize`, `safeDeleteObject`. Never imported into a Client Component. |
| `upload-to-storage.ts` | `"use client"` — the one function that actually talks to Storage from the browser. |
| `media-url.ts` | `getPublicMediaUrl()` — pure string building, no network call. |
| `avatar-fallback.ts` | `getInitials()` for the `Avatar` fallback state. |
| `media-action-result.ts` | The shared `MediaActionResult` success/error shape every media Server Action returns. |

Components under `src/components/media/`: `avatar.tsx` (shared identity
avatar, every surface), `image-upload-field.tsx` (shared
upload/preview/replace/remove control, used by both profile and community
settings), `post-image-picker.tsx` (composer-only staging picker),
`post-media-grid.tsx` (post rendering + lightbox), `post-media-editor.tsx`
(post-edit removal only).

`src/types/database.ts` — added `avatar_path` / `cover_path` to `Profile`
and `CommunityRow` (+ every community summary row type); `PostMediaItem`
(the `jsonb` shape embedded in every post-row RPC's `media` column);
`author_avatar_path` / `actor_avatar_path` / `other_avatar_path` added to
every comment/notification/conversation row type; the four new RPC
signatures (`attach_post_media`, `remove_post_media`,
`set_community_avatar`, `set_community_cover`).

## Server actions

- `app/(protected)/settings/profile/actions.ts` — `updateAvatar`,
  `removeAvatar`, `updateCover`, `removeCover`.
- `app/(protected)/posts/actions.ts` — `attachPostMediaAction`,
  `removePostMediaAction`.
- `app/(protected)/communities/[slug]/actions.ts` —
  `updateCommunityAvatarAction`, `removeCommunityAvatarAction`,
  `updateCommunityCoverAction`, `removeCommunityCoverAction`.

Every export is an async Server Action. The acting user always comes from
`requireCompletedProfile()`; ids that matter for authorization (post id,
community id) are always bound as leading server arguments by the rendering
component, matching every pre-Pass-7 action module's convention — never a
raw form field a browser could substitute.

## SQL verification

Run in the Supabase SQL Editor **after** applying the migration. (See also
`docs/RELEASE_CHECKLIST.md`-style manual review for prior passes — this
follows the same shape.)

### Bucket exists, is public, and has the expected limits

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'diong-public-media';
```

Expect `public = true`, `file_size_limit = 6291456`,
`allowed_mime_types = {image/jpeg,image/png,image/webp}`.

### Storage policies on `storage.objects` for this bucket

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    qual::text ilike '%diong-public-media%'
    or with_check::text ilike '%diong-public-media%'
  )
order by cmd, policyname;
```

Expect exactly three: one `select` (`public` role, unconditional bucket
match), one `insert` and one `delete` (both `authenticated`, both calling
`media_path_owner_ok(name)`). No `update` policy.

### `profiles.avatar_path` / `cover_path` exist

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('avatar_path', 'cover_path')
order by column_name;
```

### `communities.avatar_path` / `cover_path` exist

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'communities'
  and column_name in ('avatar_path', 'cover_path')
order by column_name;
```

### `post_media` table shape

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'post_media'
order by ordinal_position;
```

### Foreign keys

```sql
select conname, conrelid::regclass as tbl, confrelid::regclass as ref_tbl,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.post_media'::regclass and contype = 'f'
order by conname;
```

Expect `post_id → public.posts(id) on delete cascade` and
`user_id → auth.users(id) on delete cascade`.

### CHECK + UNIQUE constraints

```sql
select conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.post_media'::regclass
  and contype in ('c', 'u', 'p')
order by contype, conname;
```

Expect CHECKs on `mime_type`, `size_bytes > 0`, `size_bytes <= 6291456`,
`position >= 0`, `alt_text` length, `storage_path` not blank; UNIQUE on
`storage_path` and on `(post_id, position)`.

### Indexes

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'post_media'
order by indexname;
```

Expect `post_media_post_position_idx (post_id, position)` and
`post_media_user_created_idx (user_id, created_at desc)`, plus the primary
key and unique-constraint indexes.

### RLS enabled

```sql
select relname, relrowsecurity
from pg_class
where oid = 'public.post_media'::regclass;
```

Expect `relrowsecurity = true`.

### RLS policies on `post_media`

```sql
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'post_media'
order by cmd, policyname;
```

Expect exactly one `select` policy, using `viewer_can_see_post(post_id)`. No
`insert` / `update` / `delete` policy.

### Table grants — no direct writes for any client role

```sql
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('post_media', 'profiles', 'communities')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expect: `post_media` → `authenticated` has only `SELECT`, `anon` has no
rows. `profiles` → `authenticated` includes `UPDATE` (column-scoped to
`avatar_path`, `cover_path` among others — see the next query). `communities`
→ unchanged from Pass 5 (no client write grant at all).

### Column-scoped grant on `profiles`

```sql
select column_name, privilege_type, grantee
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('avatar_path', 'cover_path')
order by column_name, grantee;
```

Expect `UPDATE` granted to `authenticated` for both columns.

### Function security settings (SECURITY DEFINER + search_path)

```sql
select p.proname, p.prosecdef as security_definer, p.provolatile as volatility,
       p.proconfig as config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'media_path_owner_ok', 'attach_post_media', 'remove_post_media',
    'set_community_avatar', 'set_community_cover',
    'enforce_post_media_ownership'
  )
order by p.proname;
```

Expect `security_definer = true` and `config = {search_path=""}` for every
row. `media_path_owner_ok` is `s` (stable); the rest are `v` (volatile).

### Execution privileges — anon denied, authenticated minimal

```sql
select p.proname,
  has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
  has_function_privilege('anon', p.oid, 'execute')          as anon_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'media_path_owner_ok', 'attach_post_media', 'remove_post_media',
    'set_community_avatar', 'set_community_cover',
    'enforce_post_media_ownership'
  );
```

Expect `enforce_post_media_ownership` (a trigger function): `auth_exec =
false`, `anon_exec = false`. Every other function: `auth_exec = true`,
`anon_exec = false`.

### Cross-user denial spot checks

Authenticated separately as **A** and **B** (two real Supabase sessions —
these are the same "authenticate as each user, run this" checks every prior
pass's doc uses):

```sql
-- As B: cannot set an avatar/cover on A's profile — RLS update policy is
-- owner-only and pre-dates this migration; the column grant does not widen it.
update public.profiles set avatar_path = 'profiles/<A-uuid>/avatar/x.png'
where id = '<A-uuid>'; -- 0 rows updated (RLS silently filters, or 42501 depending on client)

-- As B: cannot attach media to A's post.
select public.attach_post_media(<A_post_id>, 'posts/<B-uuid>/<A_post_id>/x.png',
  'image/png', 1000, null, null, null); -- ERROR 42501

-- As B: cannot set A's community avatar (even if B is a moderator of it).
select public.set_community_avatar(<A_owned_community_id>,
  'communities/<B-uuid>/<A_owned_community_id>/avatar/x.png'); -- ERROR 42501

-- As B: cannot remove media belonging to A's post.
select public.remove_post_media(<A_post_media_id>); -- ERROR 42501 ("This image is not available.")
```

### Post media count / ownership integrity

```sql
-- No post exceeds 4 images.
select post_id, count(*) from public.post_media
group by post_id having count(*) > 4; -- 0 rows, always

-- Every post_media row's user_id matches its post's author (trigger + RPC
-- should make this a structural invariant, never just an app-layer promise).
select pm.id from public.post_media pm
join public.posts p on p.id = pm.post_id
where pm.user_id <> p.user_id; -- 0 rows, always
```

## Manual browser verification

See the Step 5 report's "Manual browser test checklist" for the exact,
numbered walkthrough (profile, posts, community, responsive, block
regression) — reproduced there rather than duplicated in full here to avoid
the two drifting out of sync. The short version: two completed-onboarding
accounts, **A** (owner of a community) and **B**; verify upload / preview /
replace / remove for every one of the five image slots (profile avatar,
profile cover, post images ×4, community avatar, community cover); verify
rendering on every surface listed under Display above; verify a moderator
and a regular member cannot see or use A's community branding controls;
verify unsupported-format and oversized-file rejection; verify 375px /
768px / desktop layouts; verify the block regression (A blocks B, B's
existing content and controls behave exactly as Pass 1–6 already specify,
unblock, confirm restored).
