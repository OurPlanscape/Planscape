# OpenPanel → Mixpanel migration

One-off tool to export Planscape's analytics history from the self-hosted
OpenPanel instance (`op.sig-gis.com`, project `spatial-informatics-group/planscape`)
and import it into Mixpanel. Self-contained `uv run --script` — no changes to
the main app's `pyproject.toml`/`uv.lock`.

## Manual prerequisites (not scriptable)

1. **OpenPanel export credentials.** In the `op.sig-gis.com` dashboard →
   Settings → Clients, create a new client of type `read` (or `root`) scoped
   to the Planscape project. This must be separate from the existing
   ingest-only `OPENPANEL_CLIENT_ID`/`OPENPANEL_CLIENT_SECRET` in `.env` —
   those are write-scoped and get a 401 against `/export`. Note the client
   id/secret. If the client isn't scoped to a single project, also grab the
   project's internal id (a cuid, not the `spatial-informatics-group/planscape`
   URL slug) via a `root` client against `GET /api/manage/projects`.
2. **Mixpanel test project.** Mixpanel has no API to create or delete
   projects — do this by hand: Org Settings → Projects → Create Project, then
   Project Settings → Service Accounts to create a Service Account scoped to
   it. Note the project id + service account username/secret.
3. **Mixpanel production project.** Locate the existing "Planscape
   Production" project id and create/reuse a Service Account with import
   permission on it.
4. After the test run is validated, **manually delete the test project** in
   the Mixpanel UI — again, no API for this.

## Configuration

Add to the repo root `.env` (see `.sample.env` for placeholders):

```
OPENPANEL_EXPORT_CLIENT_ID=
OPENPANEL_EXPORT_CLIENT_SECRET=
OPENPANEL_EXPORT_PROJECT_ID=

MIXPANEL_TEST_PROJECT_ID=
MIXPANEL_TEST_SA_USERNAME=
MIXPANEL_TEST_SA_SECRET=

MIXPANEL_PROD_PROJECT_ID=
MIXPANEL_PROD_SA_USERNAME=
MIXPANEL_PROD_SA_SECRET=
```

`OPENPANEL_URL` is already set in `.env` and is reused as-is.

## Usage

Run from this directory (or pass `--data-dir` to point elsewhere). Each step
writes/reads plain NDJSON under `data/` (gitignored) so it can be inspected,
re-run, or re-targeted without redoing earlier steps.

```bash
# 1. Pull raw events from OpenPanel into data/raw/*.ndjson (resumable: re-run
#    to pick up where an interrupted export left off).
uv run migrate.py export --start 2024-01-01 --end 2026-07-29

# 2. Convert data/raw/*.ndjson into data/converted/{events,profiles}.ndjson.
#    Records that can't be mapped (e.g. no identity at all) go to
#    data/skipped.ndjson with a reason.
uv run migrate.py convert

# 3. Upload to Mixpanel. --target is required, no default.
uv run migrate.py upload --target test

# Or all three in one go:
uv run migrate.py run --start 2024-01-01 --end 2026-07-29 --target test
```

`upload --target production` (or `run ... --target production`) prompts for
a typed confirmation phrase before sending anything, to make an accidental
production write hard to do by muscle memory. Pass `--yes-really-production`
to skip the prompt in non-interactive use.

Failed Mixpanel batches (validation errors, non-2xx responses) are written to
`data/failed/` with both the request batch and Mixpanel's response, rather
than aborting the whole upload.

## Recommended rollout

1. Small dry run against a single day: `export --start <yesterday> --end
   <today>`, then `convert`, and eyeball `data/converted/events.ndjson` /
   `profiles.ndjson`.
2. `upload --target test` that same small window. Confirm in Mixpanel's Live
   View that events/profiles land with correct `time`, `distinct_id`, and
   properties before trusting the field mapping at scale.
3. Full `run --target test` across the whole history. Compare OpenPanel's
   reported `meta.totalCount` per window (printed during `export`) against
   Mixpanel's `num_records_imported` totals (printed during `upload`), and
   spot-check a handful of events/profiles in the Mixpanel UI.
4. Manually delete the test Mixpanel project.
5. Final import to production: `upload --target production` (reusing the
   already-converted NDJSON from step 3 — export/convert are target-agnostic,
   no need to re-export), or `run ... --target production` for a fresh pull.

## Field mapping notes (`convert.py`)

- `distinct_id` = OpenPanel `profileId` if present, else `deviceId`
  (anonymous events still import, just not linked to a named user).
- `$insert_id` = OpenPanel's event `id` (a UUID, fits Mixpanel's ≤36-byte
  limit) — makes re-running `upload` safe to retry without creating
  duplicates.
- Geo (`$city`/`$region`/`mp_country_code`) and device (`$os`/`$browser`)
  fields are copied explicitly from OpenPanel rather than left for Mixpanel
  to derive via GeoIP/user-agent parsing at import time, since Mixpanel's
  GeoIP-at-import uses today's IP-location tables — a poor match for
  backdated historical events, and OpenPanel already resolved these at
  ingest time.
- Custom `properties.*` pass through as-is (except `__query`, whose
  `utm_*` keys are flattened to top-level properties).
- `mp_lib` / `$source` are set to `"openpanel-migration"` on every imported
  event, so migrated data stays distinguishable from anything tracked
  natively into Mixpanel later.
- Profiles are de-duplicated by id across all events before import (the
  OpenPanel export API attaches a `profile` snapshot per-event via
  `includes=profile`; there's no standalone "list all profiles" endpoint).

## Gotchas found by testing against the real op.sig-gis.com deployment

Both confirmed empirically against live data/credentials, neither documented
anywhere:

- **OpenPanel's `includes` param must be sent as repeated query params**
  (`includes=properties&includes=profile&...`), not one comma-joined value.
  A comma-joined `includes` is silently ignored — the response falls back to
  the default (minimal) field set with no error, which would have meant
  quietly losing `properties`, geo, device, and profile data across the
  entire export. `openpanel_client.py`'s `INCLUDES` is a list for exactly
  this reason; do not collapse it back into a string.
- **Mixpanel's `/engage` batch-update still requires a `$token` field per
  record**, even when authenticating with a Service Account + `project_id`
  query param (unlike `/import`, which needs neither). The numeric
  `project_id` works as the token value. `MixpanelClient.import_profiles`
  injects `$token = config.project_id` into each record at send time —
  intentionally not baked into `convert.py`'s output, so the same converted
  NDJSON can be uploaded to either target without re-converting. Omitting
  `$token` doesn't error — it returns `200 {"error": "a temporary failure
  occurred", "status": 0}`, which reads like a transient outage but is
  actually a rejected/malformed payload.
- **OpenPanel's own event count metadata (`meta.totalCount`/`meta.pages`) is
  unreliable and must not be used for pagination termination.** A request
  that returned 50 events in `data` reported `totalCount: 0, pages: 0` in
  the same response; a real 30-day window's actual volume (6,377 events,
  128 pages) was silently truncated to a fixed 300 (6 pages) when trusting
  that field. `openpanel_client.py`'s `fetch_window` pages until a genuinely
  empty page comes back instead — slower, but can't be fooled by a wrong
  counter. Also: page size is hard-clamped to 50 server-side regardless of
  the `limit` requested (tried up to 1000).
- **`/import`'s strict-mode 400 responses still partially succeed** — a
  batch of 2000 that returned `400 "some data points... failed validation"`
  had `num_records_imported: 1873` and only 127 entries in `failed_records`.
  Treating any non-2xx status as "whole batch failed" (an easy first
  instinct) silently discards the successful rows too. `failed_records` is
  also *omitted entirely* (not present-but-empty) on a clean 200 — the only
  reliable signal that a response is structured is `num_records_imported`
  being present at all; branch on that, not on HTTP status.
- **Mixpanel rejects a specific set of placeholder `distinct_id` values**
  case-insensitively (`none`, `null`, `undefined`, `anonymous`, the all-zero
  UUID, etc — see `convert._BAD_DISTINCT_IDS`, taken verbatim from a real
  `failed_records[].message`). Some OpenPanel events carry a `deviceId` of
  the literal string `"None"` (not JSON `null`), which passes a naive
  truthiness check. `convert._distinct_id` filters both `profileId` and
  `deviceId` against this blocklist before falling back between them,
  routing anything that fails to `skipped.ndjson` instead of uploading it
  and having Mixpanel reject it.
