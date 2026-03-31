# Saadiyat Lagoons HSE Public Site — Version 2

This package is prepared for a **free public website** using **GitHub Pages**.

## What is included
- Professional company-style public dashboard
- Inspection register
- Photo evidence support
- Closeout action tracker
- Cluster responsibility directory
- Automatic rebuild when the Excel file is updated in the repository

## Public internet access
Yes — once you upload this package to GitHub and enable **GitHub Pages**, anyone with the website link can open it on the internet.

## How to publish for free
1. Create a new repository on GitHub.
2. Upload all files from this package into the repository.
3. Keep the Excel file at:

   `source/Saadiyat_Lagoons_HSE_Full_System_Updated.xlsx`

4. In GitHub, go to:
   - **Settings**
   - **Pages**
   - Set source to **GitHub Actions**

5. Push the repository to the `main` branch.

GitHub Actions will build the site and publish it automatically.

## Your public website link
After deployment, GitHub Pages will give you a public link like:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## How automatic update works
Whenever you replace the Excel file in the `source` folder and push the change to GitHub:
- the workflow runs automatically
- `scripts/build_data.py` reads the workbook
- `data/site-data.json` is rebuilt
- the public site updates

## Closeout status update
To preserve manual closeout updates even after the Excel file changes:
1. Create this file in your repo:

   `data/status-overrides.json`

2. Use this format:
```json
{
  "CAPA-001": {
    "status": "Closed",
    "close_date": "2026-04-03",
    "comments": "Verified closed by PMC."
  },
  "CAPA-002": {
    "status": "In Progress",
    "close_date": "",
    "comments": "Waiting for contractor evidence."
  }
}
```

A sample file is already included as:
- `data/status-overrides.example.json`

## Photo evidence
Use the `Evidence_Link_or_Photo` column in your workbook for:
- public image URLs, or
- public file URLs

If the value ends with `.png`, `.jpg`, `.jpeg`, `.webp`, or `.gif`, the website treats it as an image.
Otherwise, it is shown as an evidence link.

## Local preview
You can preview the site locally by opening `index.html` in your browser.

## Manual rebuild on your computer
If you want to rebuild before uploading:
```bash
pip install openpyxl
python scripts/build_data.py
```

## Important note
This package is **ready for public deployment**, but it is **not published automatically from this chat**.
You still need the one-time GitHub upload and Pages activation.


## Offline open fix
You can now open `index.html` directly after unzip. The data is also embedded in `data/site-data.js`, so the dashboard works even without a local server.


## Version 3 professional layout
This version has a more polished public-facing design:
- cleaner executive dashboard
- stronger typography and spacing
- more readable inspection cards
- better section flow for managers and site teams
- easier public presentation for all stakeholders
