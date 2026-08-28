# Video distribution

Postiz owns platform distribution, not video production.

Seek produces an immutable, checksum-bound release bundle. Postiz validates the
bundle and, only with `--apply`, copies the declared artifacts into its own
ignored inbox:

```bash
pnpm video-distribution:import -- \
  --bundle /Volumes/SSD/Workspace/seek/var/video-production/releases/<bundle-id>

pnpm video-distribution:import -- \
  --bundle /Volumes/SSD/Workspace/seek/var/video-production/releases/<bundle-id> \
  --apply
```

The first command is read-only. The second creates:

```text
var/video-distribution/inbox/<bundle-id>/
```

The imported copy includes `distribution-ownership.json`. Postiz may delete
only that imported copy according to its own retention policy. It may never
modify or delete the Seek source project, master, or release bundle.

Importing is not publication. Provider selection, account authorization,
scheduling, upload, receipts, retry policy, playlists, analytics, and cleanup
remain separate Postiz responsibilities.

Publish and update commands accept only `--bundle` paths under
`var/video-distribution/inbox/`. They revalidate artifact hashes and
`distribution-ownership.json` before reading a video, cover, or metadata file;
arbitrary Seek project paths are rejected.

Platform entry points remain separately authorized from import:

- `video-distribution:publish-longform`
- `video-distribution:publish-short`
- `video-distribution:update-description`
- `video-distribution:update-thumbnail`
- `video-distribution:cleanup-longform`
- `video-distribution:cleanup-shorts`

Each entry point requires its own explicit arguments and authorization. Do not
invoke a platform command merely because a bundle was imported.

## Tiny Agent one-minute English Shorts

Starting with Seek `RUN_KEY=2026-08-08-04`, the separately authorized Tiny
Agent daily automation imports a checksum-bound `videoKind=short`, `en-US`
bundle and publishes the Postiz-owned copy with:

```bash
pnpm video-distribution:publish-short -- \
  --bundle /Volumes/SSD/Workspace/postiz-app/var/video-distribution/inbox/<bundle-id> \
  --wait
```

The command rejects non-Short bundles, non-English metadata, non-vertical
masters, durations outside 50–65 seconds, private visibility, playlist leakage,
and arbitrary source paths. From `RUN_KEY=2026-08-28-04`, it requires and
preserves the fixed description and bare `https://tapto.top` URL from the
immutable bundle; Markdown link syntax is rejected. Earlier Short descriptions
must remain empty. Public verification requires both
the title and description to match the bundle metadata. It is
duplicate-safe by immutable receipt and exact public YouTube title. Completion
requires Postiz `PUBLISHED`, or a reverified
`already-published` result, plus YouTube `privacyStatus=public`,
`uploadStatus=processed`, and HTTP 200 from the public `/shorts/<videoId>` URL.
Import, upload, queueing, or a video ID alone is not completion. The historical
`2026-08-07-04` run is outside this authorization and must not be backfilled.
