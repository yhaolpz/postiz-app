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

Existing platform entry points are intentionally manual:

- `video-distribution:publish-longform`
- `video-distribution:update-description`
- `video-distribution:update-thumbnail`
- `video-distribution:cleanup-longform`
- `video-distribution:cleanup-shorts`

Each entry point requires its own explicit arguments and authorization. Do not
invoke a platform command merely because a bundle was imported.
