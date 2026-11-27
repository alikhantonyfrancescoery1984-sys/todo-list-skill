# Visual contract · M009

The supplied taste references guide the actual workspace UI: milk-white #FAF9F4, ink #1F241F, muted #5E665D, sage #E5EDCE, aqua #DCECEB and pale yellow #F6EDB8. Use dark primary controls, shared semantic tokens, offline CJK typography and tabular data. Radius scale 24/16/10px, spacing 24/16/8px; equal outside edges. System dark preference retains this explicit light workspace palette.

Home shows a rounded module card, followed by the task disclosure with a permanent label and add control. The module card has actual recorded duration, per-module duration/completion count, proportional bars and a native details explanation of coverage. All task actions remain discoverable when the list is collapsed. Daily statistics omits modules and retains summary values, seven-day chart, date controls and a scrollable details table.

Clicking task-area blank space or add opens the shared task form. Clicking task title edits the local display name or deletes the task; checkbox and source link are independent. Cancel/Escape closes the editor and restores focus. Deletion preserves a tombstone without an undo banner. New drafts have stable identity during save retry. Preserve file folding and expansion across rerenders; source links never toggle summaries. Remove the noisy source-changed hint from each task; retain actual unavailable-source status.

The task editor uses native host Modal / browser dialog, a visible label, a 2000-character limit, retained text on error and busy protection. Do not mutate source notes or erase historical events for local edits/deletion.

Motion serves controls: 150ms hover, 90ms press, 200ms editor entry, 180ms disclosure arrow, 160ms completion tick. Only transform/opacity/colors; no recurring decoration or scroll animations. Under reduced motion, both modal root and descendants rest. Focus is immediate and targets are at least 44px. Provide skip navigation in the preview.

Shared src/ui/workspace/theme.css scopes both entries and editors. Verify 320–1440 widths, 375px long tasks, keyboard focus, hover/press, system dark preference and reduced motion. Use actual browser tests and the taste scripts; record marketing-only checker findings rather than changing an operational app into a landing page. Keep real data and screenshots private.

## M010 · Container layout

The visible name is 待办清单. Use todo-pane container queries at 540/360/260px. The host window width is independent of the sidebar width. Narrow headers stay on one line, module dates stack below whole duration values, module metadata wraps by units, and file summaries use a full-width two-line title above count/chevron/source controls. At very narrow widths a task source link moves below its title; all controls retain 44px targets. Editable title buttons explicitly use white-space:normal to override Obsidian defaults. Validate real host CSS in addition to an isolated browser.
