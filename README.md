# Saadiyat Lagoons HSE Portal — Updated Option 1 Package

## Website files
- index.html
- assets/styles.css
- scripts/app.js
- data/workbook-data.json

## Converter
- scripts/convert_excel_to_json.py

## Source workbook
- source/Saadiyat_Lagoons_HSE_Weekly Cluster KPI & Gap Analysis.xlsx

## How to update later
1. Replace the workbook in `source/`
2. Rename it to `workbook.xlsx`
3. Run `python scripts/convert_excel_to_json.py`
4. Upload the new `data/workbook-data.json`
5. Refresh the website

## Current package
This package already includes all current workbook sheets converted to JSON from the updated Excel file.
