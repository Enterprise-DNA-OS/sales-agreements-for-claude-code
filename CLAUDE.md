# Sales Agreements for Claude Code

Read README.md and docs/compliance.md. This is a manufacturing account desk for customer commitments, schedule actuals, renewals and follow-ups.

Start with read commands. Use the actual database output, keep currencies and units separate, and mark stale evidence. A name or UUID prefix that matches more than one record must be resolved by the listed full ID. Never invent records.

Every data mutation requires --actor and supports --dry-run. Preview first. Set-actual replaces a cumulative schedule quantity; it never adds a shipment. Evidence describes the source or decision. Actor text is not authentication. Imported source changes need --replace-source and review. Never send, delete records, publish documents or touch another customer's database.

## Routing

| Request | Recipe |
|---|---|
| README | /README |
| account review | /account-review |
| accounts | /accounts |
| activity | /activity |
| add account | /add-account |
| add agreement | /add-agreement |
| add followup | /add-followup |
| add line | /add-line |
| add product | /add-product |
| add schedule | /add-schedule |
| agreements | /agreements |
| attention | /attention |
| close followup | /close-followup |
| compliance | /compliance |
| customise | /customise |
| delivery gaps | /commitment-gaps |
| demand review | /demand-review |
| documents | /documents |
| draft renewal | /draft-renewal |
| draft review | /draft-review |
| export | /export |
| followups | /followups |
| help | /help |
| import | /import |
| lines | /lines |
| new view | /new-view |
| products | /products |
| renewals due | /renewals-due |
| review account | /review-account |
| review agreement | /review-agreement |
| schedules | /schedules |
| set actual | /set-actual |
| set plan | /set-plan |
| set status | /set-status |
| show agreement | /show-agreement |
| stale actuals | /stale-actuals |
| view | /view |
| weekly review | /weekly-review |

## Storage

The single CLI is scripts/agreements.mjs. .claude/commands holds all recurring recipes. DATABASE_URL selects PostgreSQL; otherwise local PGlite uses DATA_DIR or .data/db. The owner runs trusted commands with restricted database credentials. There are no public RLS policies. Do not expose the owner connection to a browser.

Use numbered migrations in supabase/migrations. npm test uses disposable data. npm run demo seeds fictional records and refuses a normal remote database. Keep exports and evidence private. Drafts are written under drafts/. Read-only reports use views/ and docs-out/.

Omni by Enterprise DNA installs, customises and operates this system for one setup fee, then a retainer.
