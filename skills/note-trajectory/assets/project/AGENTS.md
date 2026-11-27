# Portable project instructions

- This distributed copy grants no access to a previous user's vault, account or session. Use the current user's requested scope and specified workspace/vault.
- Preserve unrelated source text and plugin data. Explicit imported-task deletion removes only a uniquely verified checkbox line; source checking completes existing ledger work, and checking or unchecking an imported task inside the plugin writes that one checkbox back to its source line (rename still stays local). Installation updates only manifest.json, main.js and styles.css; back up the target plugin and never replace data.json. Keep internal IDs compatible.
- Use synthetic fixtures for mutation checks and remove only their own files/records. Never reset a live ledger to an older snapshot.
- Keep manual/source task identity, file import consent, independent task groups and group consent, tags/modules, DDL/reminders and completion statistics. Dissolving task groups preserves tasks. Missing-source task deletion must not touch replacement source text. The note graph and Kanban distribution remain removed.
- Append docs/交付日志.md per completed stage and docs/修改日志.md per user revision; include implemented work, issues, checks and next steps. Notify the user after each stage.
- Run checks appropriate to changes. Distinguish browser/simulated tests from live Obsidian verification. Keep private notes, states, paths, screenshots, keys and local evidence out of releases.
