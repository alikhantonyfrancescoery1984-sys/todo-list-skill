# 待办清单 · Obsidian Skill

一个可独立分发的 Codex Skill，附带 **0.6.1** Obsidian 插件、离线 HTML 预览和可构建源码。Skill 负责指导安装、预览与维护，常驻待办界面由 Obsidian 插件运行。无需会员、模型 API 或云服务。

## 安装 Skill

在 Codex 中发送：

> 安装 https://github.com/alikhantonyfrancescoery1984-sys/todo-list-skill/tree/main/skills/note-trajectory 这个 Skill。

也可从 [Releases](https://github.com/alikhantonyfrancescoery1984-sys/todo-list-skill/releases/latest) 下载 note-trajectory-skill.zip，把其中 note-trajectory 文件夹放进 Codex 的 skills 目录（默认 ~/.codex/skills）。下一轮对话使用 `$note-trajectory`。

示例：

- `$note-trajectory 打开 HTML 预览。`
- `$note-trajectory 把插件安装到我指定的 Obsidian 库，升级时保留原数据。`
- `$note-trajectory 修改待办界面，并运行测试。`

## 功能

- 手动新建、改名、删除、撤销及完成；笔记待办持续收录，超过五条未完成且有新项时先询问。
- #标签匹配/创建模块；手动模块可改名，来源名称只读；删除模块连同关联手动待办，保留笔记来源任务和历史。
- 上海时间 DDL、可点击上午/下午与时/分、天/小时提前量、截止排序、时间悬浮提示及到点名称变红。
- 首页模块分布；每日统计区分累计与当日新增，提供近七天及来源明细。只汇总已记录活动，不补造关闭期间或未记录的时间。
- 不修改源笔记，任务身份、许可与状态持续保存。旧笔记轨道和 Kanban 分发已移除。

## 直接使用插件或预览

Releases 同时提供插件 ZIP 与预览 ZIP。插件只需将 manifest.json、main.js、styles.css 放进目标库的 .obsidian/plugins/note-trajectory，再在社区插件中启用。升级前备份，**保留 data.json**。这是手动安装版本，未声称已通过 Obsidian 社区插件上架审核。

预览解压后直接打开 index.html，数据全部合成，与真实库独立。源码在 skills/note-trajectory/assets/project；复制到工作目录后运行 npm ci --ignore-scripts 和 npm run check。浏览器测试需要已安装 Chrome（支持 CHROME_PATH）。

目录分类使用随源码的明确别名，定制在 src/core/model.ts；目前未提供目录配置界面。提醒是应用内名称变红，关闭时不发系统推送。当前时区为 Asia/Shanghai。

## 验证与数据

版本基线：55 项 Node 行为、53 项 Chrome 流程、严格类型和双构建通过，并在 Obsidian 实机验证。分发不包含个人笔记、data.json、备份、截图、密钥或原会话权限。包内 bundle.json 记录文件 SHA-256，发布附件附带 SHA256SUMS。

## 许可证

[MIT](LICENSE)。内部插件/Skill ID 保留 note-trajectory，用于已有数据兼容。
