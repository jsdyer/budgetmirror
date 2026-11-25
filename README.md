# Budget Mirror

[Use Budget Mirror](https://coolcode.ca/budgetmirror/) to compare private household spending with official Statistics Canada averages. No account or API key is required. All spending calculations and scenario imports happen in the browser.

<!-- coolcode:guide -->
Choose a published geography, income group, household type or tenure, then enter only the spending categories you know. Blank amounts are unknown, while zero means no spending; the comparison subtotal matches only entered categories with a published estimate. Survey-year averages are historical context, not recommended budgets or current prices.
<!-- /coolcode:guide -->

## What it does

- Province, region and territorial-capital comparisons; income quintiles where published; national household-type and tenure comparisons.
- Select reference years from actual captured data. The initial source downloads contain years through **2023**, not a 2026 spending estimate.
- Fourteen non-overlapping current-consumption categories with inclusion notes, monthly/annual conversions, category differences and matched subtotal charts.
- Explicit save/load/delete on this device, private JSON scenario import/export, comparison CSV and printable results.
- Missing/suppressed values remain missing. Source quality flags and vector identifiers are retained.

Example: entering $1,000 monthly for food compares that amount against the selected group's annual food estimate divided by 12. Leaving transportation blank excludes both your transportation and its reference estimate from the subtotal. Entering zero includes a genuine zero expense.

## Sources and interpretation

The collector downloads official English CSV ZIPs for the Survey of Household Spending:

| Table | Published comparison |
|---|---|
| [11-10-0222-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022201) | Canada, regions and provinces |
| [11-10-0233-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110023301) | Whitehorse, Yellowknife and Iqaluit |
| [11-10-0223-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022301) | Income quintile by available geography |
| [11-10-0224-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022401) | Household type, Canada |
| [11-10-0225-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022501) | Housing tenure, Canada |

These dimensions are not freely crossed: the app never invents a “BC renter, one-person, lowest quintile” result. Averages cover all households in the group, including non-spenders. Reference years use nominal dollars, without inflation adjustment. Shelter/transport include large or irregular expenditures. The selected categories exclude income tax, pension contributions, savings, gifts and certain other cash flows; the app does not describe its subtotal as total household expenditure. Published sums may differ through rounding.

Data: Statistics Canada, used under its [Open Licence](https://www.statcan.gc.ca/en/reference/licence). This independently produced app is not endorsed by Statistics Canada. `web/data/spending.json` records source URLs, reference years, check timestamps and SHA-256 hashes of the downloaded ZIPs. A successful check date is distinct from the survey year.

## Privacy

No spending, imported scenarios, location or form inputs are uploaded. Public configuration and benchmark files are retrieved from this site. Save is explicit and uses `coolcode:budgetmirror:scenario` local storage; Delete saved removes it. Clear amounts only clears the active form. Closing/reloading discards unsaved entries. Exported scenarios contain personal amounts and should be kept private. The shared CoolCode counter counts aggregate opens, not these inputs.

## Expand or customize

Edit `config.json`:

- `tables` declares the exact official table ID, supported comparison mode and optional dimension column. Unknown source dimensions fail validation.
- `categories` controls identifiers, source CSV names, visible labels and inclusion notes. **Keep selected source categories non-overlapping.** Do not combine a total such as Food expenditures with its groceries/restaurant children.
- Add a new non-overlapping category or replace a broad category with an explicitly documented breakdown. For example, add a separately labelled income-tax category only after changing the UI's current-consumption explanation. Counts and inputs derive from the snapshot rather than the initial list length.

Then run `python3 scripts/refresh.py`, review the actual source rows and changed coverage, run checks/build, and commit the reviewed code and initial snapshot. Existing captured reference years remain selectable. Imported scenarios using an unavailable group are rejected without replacing current entries; unknown category inputs are not silently treated as current categories.

## Refresh and publish

Python 3.12+ and Node 24+ are sufficient; runtime has no dependencies or secrets.

```sh
python3 scripts/refresh.py
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -v
python3 scripts/build.py
```

The ordinary build is offline. The collector bounds downloads/ZIP expansion, verifies schema, dimensions, dollar units, duplicate rows and configured category coverage, then atomically replaces the snapshot only after **all five sources** pass. A failed download/validation leaves the last good file untouched. Public filenames are official StatCan downloads; no credentials required.

**Browser tool · Check and publish** (`.github/workflows/pages.yml`) checks the real source on main pushes, manual dispatch and monthly at **14:17 UTC on the 20th**, then builds/tests and deploys Pages. PRs use the committed genuine snapshot and never deploy. Source failure prevents a new deployment. Refreshed data is published in the Pages artifact; it does not create automatic source commits. A later main build refreshes again before publication, so it does not redeploy an older seed snapshot.

Pages source: **GitHub Actions**. CI browser checks run at a project subpath and cover inputs, supported dimensions, storage, import/export and mobile overflow. The checked-in snapshot makes local builds reproducible; update it explicitly when changing the collection logic.

The independent watchdog registration is part of the central integration package:

- repository: `jsdyer/budgetmirror`
- workflow: `pages.yml` (dispatch has no required inputs)
- collection step: `Refresh validated Statistics Canada spending data`
- freshness URL: `https://coolcode.ca/budgetmirror/data/status.json`
- freshness field: `checked_at`; monthly checks, suggested maximum age **40 days**

The schedule guard is not a collector: the separate `schedule-guard.yml` allowlists `pages.yml` and itself and attempts to restore inactivity-disabled workflows. Regenerate it after workflow changes:

```sh
python3 scripts/add_schedule_guard.py --repository jsdyer/budgetmirror .github/workflows/pages.yml
```

Central homepage/Worker/watchdog/sitemap edits are deferred to the owner's integration round; this repository supplies `tool.json` and the above contract. Do not call central integration complete until those registrations are verified.
