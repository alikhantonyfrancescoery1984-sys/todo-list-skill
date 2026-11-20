# 安装、开发与验证

## 随包内容

Skill 根目录的 `assets/project/` 是可独立复制的项目，包含 src、tests、scripts、锁文件、必要规则/数据文档，以及已构建 dist。

- `dist/index.html` / `dist/statistics.html`：直接双击打开，不联网。所有初始数据为合成内容；localStorage 与真实 Obsidian 数据不互通。
- `dist/plugin/manifest.json`、`main.js`、`styles.css`：Obsidian 程序文件，插件显示名“待办清单”，内部 ID 为 note-trajectory。

## 安装 Obsidian 插件

在当前用户请求安装/升级并明确笔记库后进行，不沿用本项目原开发者的任何会话授权。

1. 确认目标是用户指定的库，插件目录为 `<vault>/.obsidian/plugins/note-trajectory/`。
2. 升级前备份现有该插件程序与 data.json 到用户的私人备份位置。若全新安装，不创建演示 data.json。
3. 仅复制内置或重新构建的 `manifest.json`、`main.js`、`styles.css`。禁止覆盖/重置 data.json，也不批量覆盖其它插件。
4. 用户可在 Obsidian 社区插件页面启用“待办清单”；已启用 CLI 时也可仅重载该插件。不要为此重新启动整个应用或改动其它插件。
5. 打开命令“待办清单: 打开待办清单”。需要手动重读时使用“读取当前笔记待办”。未索引/跳过的笔记不会被假称已收录。

只有用户明确要求本地测试时才创建专用合成笔记；记录专属任务/模块/事件 ID，结束清理自身数据，不能恢复整个旧快照覆盖期间的新任务。

## 修改与构建

把 assets/project 复制到用户工作目录。需要 Node.js 22+ 和 npm；修改源码后构建，不手工修补已生成 main.js。

```sh
npm ci --ignore-scripts
npm run check
```

`check` 执行严格 TypeScript、55 项行为测试和 HTML/插件双构建。浏览器检查使用已安装 Chrome，可设置 CHROME_PATH：

```sh
npm run test:ui
npm run test:tasks-ui
npm run test:container-ui
npm run test:planning-ui
```

共 53 项浏览器流程覆盖任务、模块、DDL、数据、键盘/减少动态和容器适配。测试数可能随维护增加，按实际运行报告；不要将引用的旧数字当成当前已执行。

验收重点：大文件许可、连续编辑身份去重、删除防重新导入、失败重试、源链接、统计独立算法、午夜/重叠/不足一分钟、上午/下午转换、DDL 原精度、自动提醒状态及真实宿主隐藏辅助描述。原生 select 使用自动化工具的标准选项驱动；单独检查焦点顺序，避免把操作系统菜单按键假设当成功能缺陷。

浏览器/模拟测试不代表整应用强制退出或断电验证。真实库安装后另查数据、样式及来源跳转，恢复用户原有面板尺寸。目录分类别名位于 src/core/model.ts 的 DEFAULT_CONFIG；更改需重建，不宣称存在尚未实现的配置界面。
