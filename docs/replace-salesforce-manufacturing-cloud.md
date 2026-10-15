# Bring your Salesforce manufacturing agreements

The import runs once over five related CSV files. It reads offline exports and never connects to Salesforce.

Salesforce's [data portability guide](https://help.salesforce.com/s/articleView?id=xcloud.data_export_portability_across_salesforce.htm&language=en_US&type=5) names Data Loader for Manufacturing Cloud exports. Use your authorised Salesforce administrator to export Account, Product2, SalesAgreement, SalesAgreementProduct and SalesAgreementProductSchedule. Include Id and the relationship fields below. Save UTF-8 files with those object names under imports/salesforce. Keep the original export unchanged as evidence. Use one organisation per database.

| File | Required mapped columns |
|---|---|
| Account.csv | Id, Name |
| Product2.csv | Id, Name; QuantityUnitOfMeasure if supplied, otherwise units |
| SalesAgreement.csv | Id, Name, AccountId, StartDate, EndDate, Status; CurrencyIsoCode or explicit default --currency; OwnerId retained as a reference |
| SalesAgreementProduct.csv | Id, SalesAgreementId, ProductId |
| SalesAgreementProductSchedule.csv | Id, SalesAgreementProductId, StartDate, EndDate, PlannedQuantity, ActualQuantity, SalesPrice |

Object relationships are documented in the [official model](https://developer.salesforce.com/docs/platform/data-models/guide/sales-agreements.html). The [schedule mapping](https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-salesagreementproductschedule_dmo_mappings.html) documents the schedule quantity, price and date concepts. Data 360 aliases SA_Start_Date, SA_End_Date, SA_Pdct_Schd_Start_Date, SA_Pdct_Schd_End_Date and SalesPriceCurrency are also accepted. This is not a general Data 360 import. Inspect your organisation's actual export headers before switching. The bundled fixture is synthetic, not a captured customer export.

```bash
npm run agreements -- import salesforce-manufacturing-cloud --dir=imports/salesforce --currency=NZD --as-of=2026-10-15 --actor="Account manager" --dry-run --json
```

Use the true export snapshot date for --as-of. CurrencyIsoCode overrides the explicit default on each agreement. Read the counts and any rejected row, then run the same command without --dry-run. This is one command after the exports are prepared. An invalid reference, quantity, status, interval or duplicate source ID rolls back the entire import. All five files must contain records. Date-only ISO values and plain decimal quantities are required.

Every original column remains in source_row. Repeating identical source rows does not duplicate records or overwrite subsequent local edits. A changed source row is refused until --replace-source is explicitly supplied. Preview that flag first: it replaces mapped source fields, including actual quantities and prices. It clears account accuracy reviews and agreement evidence reviews where the corresponding source row changed. It never deletes records absent from the file. Source IDs must stay stable and imports must come from the same Salesforce organisation.

Supported statuses are Draft, Approved, Active, Expired and Cancelled. Map other statuses explicitly. Category-only agreement products, negative returns, attachments, signatures, opportunity pipelines, order allocation rules, permission sets, automation, custom forecasting logic and service cases do not become working features. Unmapped columns are retained as evidence. OwnerId does not become an authenticated operator. Retained raw exports are not a promise to reproduce every Salesforce screen.

Before cutover, compare record counts, every relationship, each currency's scheduled value, product units, actuals dates and at least one complete agreement. Resolve all stale records and test restore from a database backup. Keep Salesforce available until the owner accepts that reconciliation. Enterprise DNA maps the remaining records and builds required connections or screens as part of your version.

Export all local records and history with `npm run agreements -- export --out=exports/agreements.json`. It refuses to overwrite an existing file. This is a readable archive, not an automatic restore command. Protect exports and drafts like the original database.

## Meaning of actual quantities

Salesforce ActualQuantity can be calculated from orders or supplied by an external system. It is not proof of shipment. This build reports commitment gaps, not delivered quantities. Confirm the source calculation mode for each agreement before interpreting a shortfall. [Salesforce's actuals calculation guide](https://help.salesforce.com/s/articleView?id=ind.mfg_sa_actuals_reference.htm&language=en_US&type=5).

Displayed values multiply quantity by the schedule price before discounts. Salesforce ActualAmount, discounts and other source columns remain in the original imported row; the free base does not recreate those financial calculations. Reconcile quantities and raw source amounts separately. Ask Enterprise DNA to map the precise commercial measures your team uses.
