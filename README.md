# Sales Agreements for Claude Code

Know what customers committed to buy, where actual quantities fall short and which agreements need renewal work.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free MIT software. Run the demo and import your agreements. | Your products, units, review rules and Salesforce records mapped to your work. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=readme&utm_campaign=salesforce-manufacturing-cloud) · [Instead of Salesforce Manufacturing Cloud](https://enterprisedna.co/omni/instead-of/salesforce-manufacturing-cloud?utm_source=github&utm_medium=readme&utm_campaign=salesforce-manufacturing-cloud)

## Start

Node 20 or later. No database server needed for the local demo.

```bash
npm install
npm run demo
npm run agreements -- weekly-review
npm run view
npm run docs
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. AGENTS.md and CLAUDE.md point at one library of 37 slash-command recipes. The single CLI has 33 commands, all with --json. PGlite stores local records in .data/db; set DATA_DIR for another local database or DATABASE_URL for PostgreSQL. Shared installations require restricted credentials, backups and an access policy. There are no public RLS policies. The seed command refuses a normal remote database.

The Harbour Supply demo is fictional. It contains two overdue shortfalls, an ageing actuals snapshot, an overdue account review, a renewal due in 35 days and a late follow-up. Dates are relative to the first seed. Start with a fresh database for real work.

## The weekly desk

/commitment-gaps compares closed schedule periods, /demand-review shows current and upcoming commitments, /renewals-due prepares the renewal list, /account-review compares customer commitments by currency and /weekly-review combines the decisions. /compliance points to missing evidence and record checks. /draft-review and /draft-renewal save HTML to drafts/ and never send it.

Names match without case sensitivity; UUID prefixes work. Ambiguous matches list candidates and exit 1. Every mutation requires --actor, records an event and supports --dry-run. Quantities use three decimal places; unit prices use four. Calculations run as database decimals. Currencies and product units stay separate. A schedule's actual value is actual quantity times its schedule price, not recognised revenue, tax or an invoice. There is no exchange-rate conversion.

```bash
npm run agreements -- set-actual --schedule=DEMO-S1 --actual=800 --as-of=2026-10-15 --evidence="Order register checked" --actor="Mara" --dry-run
npm run agreements -- add-followup --agreement=DEMO-A1 --name="Confirm recovery quantity" --owner="Mara" --due=2026-10-20 --actor="Mara" --dry-run
```

Replace example dates with the real dates. Set-actual replaces the cumulative quantity; it does not add another shipment. Set-plan records a revised commitment and price with before-and-after evidence. Overlapping periods, impossible dates, negative quantities and schedules outside their agreement term are rejected. New agreements begin as Draft. Approval and activation require scheduled products, evidence and a current review date. Expired and Cancelled are terminal statuses.

Imported source statuses remain source facts, not local approval. Changed source rows require --replace-source and clear relevant evidence reviews. Operators must reconcile source exports before acting on them. [Exact import behaviour](docs/replace-salesforce-manufacturing-cloud.md).

## Ten questions answered today

These are demonstrated questions, not claims that Salesforce cannot answer them with configuration.

1. Which closed periods are below the agreed quantity? Use `commitment-gaps`.
2. Which shortfalls rely on old actuals? Use `stale-actuals`.
3. What quantities are committed in upcoming periods? Use `demand-review`.
4. Which agreements need renewal work in the next 60 days? Use `renewals-due`.
5. Which customer commitments have the largest overdue value in each currency? Use `account-review`.
6. Which follow-ups are overdue and who owns them? Use `attention`.
7. Which active agreements lack evidence of their terms? Use `compliance`.
8. What changed in a schedule and what evidence was recorded? Use `activity`.
9. What is the complete history we imported for this agreement? Use `export`.
10. What needs a decision in the weekly supply review? Use `weekly-review`.

## Bring your history

Export the five Salesforce objects named in the [switch guide](docs/replace-salesforce-manufacturing-cloud.md), then run one command over the folder:

```bash
npm run agreements -- import salesforce-manufacturing-cloud --dir=imports/salesforce --currency=NZD --as-of=2026-10-15 --actor="Account manager" --dry-run
```

Read the preview, then remove --dry-run. Original columns stay with each imported record, repeat imports match stable source IDs, and a broken reference rolls back the whole import. This covers accounts, products, agreement terms, product lines and schedules. It does not recreate attachments, signatures, custom calculations, permissions, live ERP connections or the service side of Manufacturing Cloud. Enterprise DNA maps and builds the additional work your version needs.

## Documents and views

Edit brand.json for the business name, logo and colours. npm run docs writes draft agreement performance statements and renewal briefs. npm run view writes the week, evidence checks and demand schedule as read-only HTML. /new-view adds another read-only report. /customise changes a field or rule through a migration and a test. [What a screen adds](docs/why-no-front-end.md).

## Your first hour: ten things to ask for

1. Put our name and logo on the agreement statement.
2. Preview our five Salesforce exports.
3. Check that product units match our order records.
4. Compare each currency's imported totals.
5. Find our oldest unverified actuals.
6. Show the agreements ending in the next two months.
7. Record the evidence for one actual quantity.
8. Add an owner and date to a recovery follow-up.
9. Draft the next supply meeting brief.
10. Add our own review policy through /customise.

## Controls and verification

[Compliance checks and official sources](docs/compliance.md) distinguish legal principles from internal policies. The 14-day actuals rule and chosen review dates are business settings. A clear report is not certification. Actor labels are attribution, not authenticated identity; database owners can alter records and bypass event protections. Protect raw exports, backups and drafts. Nothing sends or posts to a financial ledger.

npm test creates isolated data and exercises all 33 CLI commands: schedule boundaries, overlapping periods, decimal calculations, currency separation, dry runs, source import idempotency, rollback, preserved columns, exports and escaped branded documents. CI covers Windows and Linux on Node 20/22 and PostgreSQL 17. Check the current CI run for platform results. TEST_DATABASE_URL is only for an empty disposable test database.

Export with `npm run agreements -- export --out=exports/agreements.json`. The file includes records, source columns and events, and cannot overwrite an existing file. It is a readable archive, not an automatic restore. Test database backups separately.

MIT. Not affiliated with Salesforce or Anthropic. Hosting and coding-agent usage have separate costs. [Research and scope](docs/research.md). [Book 30 minutes with Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=readme&utm_campaign=salesforce-manufacturing-cloud).

## Meaning of actual quantities

Salesforce ActualQuantity can be calculated from orders or supplied by an external system. It is not proof of shipment. This build reports commitment gaps, not delivered quantities. Confirm the source calculation mode for each agreement before interpreting a shortfall. [Salesforce's actuals calculation guide](https://help.salesforce.com/s/articleView?id=ind.mfg_sa_actuals_reference.htm&language=en_US&type=5).

Displayed values multiply quantity by the schedule price before discounts. Salesforce ActualAmount, discounts and other source columns remain in the original imported row; the free base does not recreate those financial calculations. Reconcile quantities and raw source amounts separately. Ask Enterprise DNA to map the precise commercial measures your team uses.
