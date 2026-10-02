# UX audit — 2026-10-01

## Baseline (before edits)

Clean `git status --short`. Frontend lint, typecheck, 39 tests (8 files), build passed using npm.cmd because PowerShell blocks npm.ps1. Existing bundle-size and dependency annotation warnings.
Read router, current and legacy pages/components, auth/guards/session, API client/DTOs, Docs/05-api-contracts.md, project-progress.md, Prompt 10 and actual service controllers/DTOs/rules. No separate Job Board upgrade prompt exists in tracked files; current JobBoard components and tests are the implementation baseline.

| Flow | Current issue | User impact | Improvement |
|---|---|---|---|
| Find jobs | Raw location/category IDs; sort mixed into filters; back link drops query | Hard to search and compare | Real observed reference options, URL context and scroll restoration, separate sort |
| Job detail | Company ID masquerades as name; no CV prerequisite check | Unclear employer and next step | Public Company lookup and prerequisite-aware CTA |
| Apply | Only first application page checked; no default CV; immediate redirect without feedback | Duplicate attempt; extra clicks; unclear success | Paginated duplicate lookup, default CV, persistent success feedback |
| CV | Missing upload/delete success and delete errors; no return path | Candidate loses Job context | Inline feedback, accessible confirmation, safe Job return |
| Applications | Raw company ID, empty state without action | No next step | Company names, consistent labels, find-job CTA |
| Company | Browser registry shared between users; owner controls always shown | Role confusion | Account-scoped registry, only known owner controls, explicit contract limitation |
| Job editor | Initial object resets each render; lookup only first page; today allowed despite @Future | Lost edits after errors; old jobs unavailable | Stable initial data, paginated lookup, future date validation, sections |
| Employer applications | English enum buttons, nested native prompt/confirm, no success message | Ambiguous and slow | One accessible note/confirmation dialog, allowed Vietnamese actions, refresh detail/history |

## Contract boundaries

- Company GET is public, without current membership role; no company list endpoint. Creation establishes OWNER. Browser knowledge is navigation convenience, never authorization. Cannot reliably identify OWNER/RECRUITER after browser data is lost.
- No public category/location catalog. Offer only references actually returned by Jobs; advanced administrator-provided codes remain available. Observed options are not a complete catalog.
- No status filter on Application list; listing is per Job. No CV download endpoint; display supplied metadata only.
- Candidate duplicate lookup requires walking paginated owned Applications; backend unique constraint remains authoritative.
- Application history and cover letter are supported; withdrawal and simulated histories are not.
- Job creation is DRAFT; publish is a separate versioned transition. Future LocalDate required. No private Job detail endpoint; editing needs authorized company-list pagination.
- CV deletion currently permits deletion after application; immutable snapshots remain in Applications. Do not invent a deletion restriction.

Journey counts and final verification will be recorded after implementation and executable checks. No pre-change browser journey counts were collected; do not claim measured click reductions.
