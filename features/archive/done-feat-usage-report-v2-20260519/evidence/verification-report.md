# Verification Report: feat-usage-report-v2

## Summary
- **Feature**: feat-usage-report-v2 (用量报表优化)
- **Date**: 2026-05-19
- **Status**: PASS

## Task Completion
- **Total tasks**: 3 groups, 12 subtasks
- **Completed**: 12/12 (100%)
- **Incomplete**: 0

## Code Quality
- Go formatting (gofmt): PASS (auto-fixed)
- JavaScript syntax (node -c): PASS (all 3 files)
- Go compilation: PASS (model package builds)

## Gherkin Scenario Validation

### Scenario 1: Username Dropdown Search - PASS
- ReportFilter.js uses MUI Autocomplete with freeSolo for username field
- Options populated from API `usernames` field via usernameOptions prop
- onInputChange updates filter state, enabling search+select

### Scenario 2: Token Name Dropdown Search - PASS
- ReportFilter.js uses MUI Autocomplete (multiple, freeSolo) for token_name
- Options populated from API `token_names` field via tokenNameOptions prop
- Multiple selection supported with limitTags=3

### Scenario 3: Filter Layout Unified - PASS
- All controls in single Stack with direction={{ xs: 'column', sm: 'row' }}
- Username Autocomplete + TokenName Autocomplete + 2 DateTimePickers + ButtonGroup
- Responsive: mobile stacks vertically, desktop horizontal

### Scenario 4: Trend Line Chart - PASS
- Chart component uses type="line" exclusively
- Series contains only tokens (prompt+completion) and requests
- No cost/price/quota data in chart

### Scenario 5: Multi-user Line Chart - PASS
- dataByUser prop receives by_date_user from API
- Per-user series: "{username} - Tokens" (solid) + "{username} - 请求数" (dashed)
- USER_COLORS array provides distinct colors per user
- Legend shows username with line color

## Files Changed
| File | Change |
|------|--------|
| one-api/model/log.go | Added ByDateUser, Usernames, TokenName to ReportData; Username to ReportRow; by_date_user query |
| one-api/web/berry/src/views/Report/component/ReportFilter.js | Rewrote with Autocomplete + inline buttons |
| one-api/web/berry/src/views/Report/component/TrendChart.js | Rewrote with pure line chart, multi-user support |
| one-api/web/berry/src/views/Report/index.js | Wired new props, removed separate ButtonGroup |

## Issues
None.
