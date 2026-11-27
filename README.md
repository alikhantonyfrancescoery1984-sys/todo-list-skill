# 待办清单 · Obsidian Skill

一个可独立分发的 Codex Skill，附带 **0.7.13** Obsidian 插件、离线 HTML 预览和可构建源码。Skill 负责指导安装、预览与维护，常驻待办界面由 Obsidian 插件运行。无需会员、模型 API 或云服务。

## 安装 Skill

在 Codex 中发送：

> 安装 https://github.com/alikhantonyfrancescoery1984-sys/todo-list-skill/tree/main/skills/note-trajectory 这个 Skill。

也可从 [Releases](https://github.com/alikhantonyfrancescoery1984-sys/todo-list-skill/releases/latest) 下载 note-trajectory-skill.zip，把其中 note-trajectory 文件夹放进 Codex 的 skills 目录（默认 ~/.codex/skills）。下一轮对话使用 `$note-trajectory`。

示例：

- `$note-trajectory 打开 HTML 预览。`
- `$note-trajectory 把插件安装到我指定的 Obsidian 库，升级时保留原数据。`
- `$note-trajectory 修改待办界面，并运行测试。`

## 功能

- 手动新建、改名、完成、删除与撤销；笔记待办持续收录，超过五条未完成且有新项时先询问。
- #标签匹配或创建模块；模块可新建、改名、删除，来源模块名称只读；删除模块只删关联手动待办，保留笔记来源任务和历史。
- 项目看板泳道之间可拖动任务（桌面拖拽与触屏长按），指针靠近看板边缘时自动横向滚动，可拖进当前不可见的模块。
- 上海时间 DDL、上午/下午与时/分、天/小时提前量、截止升序、悬浮时间及到点名称变红。
- 每日统计区分当前累计与当日新增，提供近七天与模块完成度；只按上海日期统计数量，不采集、保存或计算时长。
- 笔记勾选同步清单完成，清单勾选/取消也写回对应源待办行（`- [ ]` ↔ `- [x]`）；从清单删除来源任务时唯一校验后删除对应源行，其它正文保留。任务身份、许可与状态持续保存；旧笔记轨道和 Kanban 分发已移除。

## 直接使用插件或预览

插件只需要 manifest.json、main.js、styles.css 三个程序文件：放进目标库的 .obsidian/plugins/note-trajectory，再在社区插件中启用。升级前备份，**保留 data.json**。这是手动安装版本，未声称已通过 Obsidian 社区插件上架审核。

本版 Release 附件：`main.js`、`manifest.json`、`styles.css`、`update.json`（供插件内置更新逐个校验），以及 `note-trajectory-skill.zip`、`note-trajectory-plugin.zip`、`note-trajectory-preview.zip`、`note-trajectory-public-source.zip` 与 `SHA256SUMS`。

预览解压后直接打开 index.html，数据全部合成，与真实库独立。源码在 skills/note-trajectory/assets/project；复制到工作目录后运行 npm ci --ignore-scripts 和 npm run check。浏览器测试需要已安装 Chrome（支持 CHROME_PATH）。

目录分类使用随源码的明确别名，定制在 src/core/model.ts；目前未提供目录配置界面。提醒是应用内名称变红，关闭时不发系统推送。当前时区为 Asia/Shanghai。

## 用户可选更新

0.7.4 起可在 Obsidian 命令面板运行“待办清单: 检查更新”，确认后校验、备份并替换三个程序文件，保留 data.json；完成后再关闭/开启插件。旧版需先手动升级到含该命令的版本。作者发布流程见 skills/note-trajectory/assets/project/docs/发布与更新.md，本地修改不等于 GitHub 发布。

## 验证与数据

版本基线：97/97 Node 行为测试、严格类型检查和双构建通过，发布前重新执行并核对产物 SHA-256。仓库内部分浏览器 UI 脚本仍按旧界面文案断言（如“模块分布”），本次未计入发布基线。分发不包含个人笔记、data.json、备份、截图、密钥或原会话权限。包内 bundle.json 记录文件 SHA-256，发布附件附带 SHA256SUMS。

## 许可证

[MIT](LICENSE)。内部插件/Skill ID 保留 note-trajectory，用于已有数据兼容。
