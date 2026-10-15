# Add followup

Read the matching records first. Collect the required values from the operator or their source document. Do not invent dates, quantities, evidence or names.

Preview:

```bash
npm run agreements -- add-followup --agreement="<id or name>" --name="<task>" --owner="<person>" --due=YYYY-MM-DD --actor="<operator>" --dry-run --json
```

Show the proposed result. Apply the same command without `--dry-run` within the operator's requested scope. Re-read the changed record. All records and the event roll back on failure. Nothing sends. For import, read docs/replace-salesforce-manufacturing-cloud.md first. Resolve ambiguous names by their listed IDs.
