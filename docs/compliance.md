# Evidence and record checks

Checked 15 October 2026. The compliance command reports record checks. It does not decide whether a contract is enforceable, a customer has breached it, or an organisation complies with the law.

| Check | Meaning | Basis |
|---|---|---|
| agreement-evidence | Active or approved agreement has no evidence reference | Internal control: retain a reference to the agreed terms. Not a statutory deadline. |
| agreement-review | Missing or overdue next review | Business chooses the review date. Not a legal notice period. |
| schedule-coverage | Active agreement has no scheduled products | Internal completeness control. |
| actuals-evidence | Actuals lack an as-of date or are over 14 days old | Business freshness policy. Change it through /customise. |
| record-accuracy | Missing or overdue account review | A reminder to check information before using it. Applies to personal information when held, including sole traders and source export columns. |
| record-retention | Missing stated retention purpose | Prompts a necessity review. No automatic deletion and no universal retention duration. |

[New Zealand Privacy Commissioner, principle 8](https://www.privacy.org.nz/privacy-principles/8/) requires reasonable accuracy checks before personal information is used or disclosed. [Principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits retention to necessary purposes. These rules do not prescribe our review interval.

[Australia's OAIC, APP 10](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-10-app-10-quality-of-personal-information) describes quality duties for organisations covered by those principles. Determine applicability to your business. A completed review field does not establish compliance.

Sales agreement metrics and periods follow the [Salesforce sales-agreement model](https://developer.salesforce.com/docs/platform/data-models/guide/sales-agreements.html). Negative quantities, invalid dates, overlapping periods and schedules outside the agreement term are rejected. Negative return quantities require a separate returns model, not an invented positive adjustment. Approval requires schedules, evidence and a current review date. Approval records an operational status, not an electronic signature or independent legal approval.

The CLI records changes in append-only events. Database owners can bypass triggers. Actor labels are supplied text. Source exports can contain personal information, and copied source rows and event history retain it. Operators need access controls, a retention and deletion procedure, tested backups, and a review of documents before sharing. No transaction is sent, paid or posted to a financial ledger.
