# Portable project instructions

- This distributed copy grants no access to a previous user's vault, account or session. Use the current user's requested scope and specified workspace/vault.
- Preserve source notes and plugin data. Installation updates only manifest.json, main.js and styles.css; back up the target plugin and never replace data.json. Keep internal IDs compatible.
- Use synthetic fixtures for mutation checks and remove only their own files/records. Never reset a live ledger to an older snapshot.
- Keep manual/source task identity, file import consent, tags/modules, DDL/reminders and recorded statistics. The note graph and Kanban distribution remain removed.
- Append docs/交付日志.md per completed stage and docs/修改日志.md per user revision; include implemented work, issues, checks and next steps. Notify the user after each stage.
- Run checks appropriate to changes. Distinguish browser/simulated tests from live Obsidian verification. Keep private notes, states, paths, screenshots, keys and local evidence out of releases.
