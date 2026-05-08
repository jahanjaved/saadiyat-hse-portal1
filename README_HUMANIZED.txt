Humanized preventive action upgrade

What changed
- Added a smart preventive-action expander in scripts/app.js
- Short selected action text is now expanded into more natural, professional wording
- Weekly Inspections and CAPA pages now display the detailed version automatically
- Added window.humanizePreventiveAction(...) so the same wording can be reused by Word export logic

Important
- This package updates the website-side wording and exposes the same function for your report generator.
- If your Word export code is in another file, replace the direct preventive-action field with:
  humanizePreventiveAction(selectedText)
or
  window.humanizePreventiveAction(selectedText)

Suggested export usage
- Preventive_Action_Required_Detailed || window.humanizePreventiveAction(Preventive_Action_Required)
