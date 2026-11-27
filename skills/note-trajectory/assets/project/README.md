# 待办清单 · 可独立构建的源码

这是随 Skill 分发的源码与离线产物副本，版本见 manifest.json。无个人笔记或运行状态。

直接打开 dist/index.html 或 dist/statistics.html 查看合成预览；Obsidian 程序在 dist/plugin，仅包含 manifest.json、main.js、styles.css。

开发需要 Node.js 22+：npm ci --ignore-scripts，然后 npm run check。浏览器测试使用已安装 Chrome，可设置 CHROME_PATH，依次运行 npm run test:ui、test:tasks-ui、test:container-ui、test:planning-ui，再运行 node scripts/source-sync-ui-check.mjs 和 node scripts/task-groups-ui-check.mjs 和 node scripts/completion-ui-check.mjs。

当前基线为 97 项 Node 行为、严格类型检查和双构建。修改后按实际输出报告。先读 AGENTS.md、PRODUCT.md、DESIGN.md；数据/接口详见 docs/数据与接口.md。目录别名位于 src/core/model.ts，时间输入与统计使用上海时区。

安装仅复制 dist/plugin 的三个程序文件到当前用户指定 vault 的 .obsidian/plugins/note-trajectory，升级保留原 data.json。不要复制合成预览数据进入个人库。许可为 MIT，详见 LICENSE。
