# Saadiyat HSE JSON Export Package

This package was rebuilt from the latest Excel workbook only.

## Included files
- `full_workbook_export.json` — complete workbook export
- `workbook_summary.json` — quick summary of every sheet
- `technical_review.md` — technical problems found in the workbook
- `sheets/` — one JSON file per sheet
- `csv/` — CSV exports for structured data sheets
- `charts/` — chart JSON + recreated PNG images

## Best file for website use
Start with:
- `full_workbook_export.json`

Or use per-sheet files under:
- `sheets/`

## Notes
- Dates are exported in ISO format
- Blank Excel cells remain null
- Existing broken Excel references are preserved as workbook issues, not silently changed
