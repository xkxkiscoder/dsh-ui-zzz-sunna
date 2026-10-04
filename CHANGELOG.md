# 更新日志

本文件记录每个版本的变化，按版本倒序排列。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

发新版本时在顶部加一段 `## [x.y.z] - 日期`，CI 会用这一段作为 GitHub Release 的正文。

## [0.1.6] - 2026-10-04

### ✨ 新增功能

- **内容背景透明度** —— 对话里的代码块、行内代码、工具卡片共用一份底色，画板里可调透明度，调低就能让立绘透过来。全局一份，不随主题切换而变。
- **启动动画播放秒数** —— 启动动画是 5.57 秒的片段，可在画板里设成只播前几秒（0 = 完整播放），改动下次启动生效。

### 📝 文档

- README 补充已适配的 dsh 最新版本（`0.2.0-rc.2`）。
- NOTICE 与 `assets/SOURCES.md` 修正启动动画来源为**官方角色 PV 片段**（此前误记为自制），并补齐 `sunna-splash.mp4` 的逐项来源、暴露面与包体统计（10.22 MB）。

## [0.1.5] - 2026-10-01

### 📝 文档

- 许可证换为 CC BY-NC-SA 4.0 的完整法律文本，并新增 `NOTICE` 记录署名链。
- 新增 `AGENTS.md`，写明协作约定与常见陷阱。
- 更新素材总量说明（含启动动画视频）。

## [0.1.4] - 2026-10-01

### 🔧 持续集成

- 发布流程幂等：重复投递的 run 不再因「版本已存在」失败。
- 同一 ref 的并发 run 排队执行。
- Release 正文改由 CHANGELOG 对应版本段生成。

## [0.1.3] - 2026-10-01

### 📝 文档

- CHANGELOG 只保留有对应 Release 的版本链接。

## [0.1.2] - 2026-10-01

### ✨ 新增功能

- **启动动画** —— 打开 dsh 时在界面上播放一段 5.6 秒的过场，播完自动淡出，点任意处可提前跳过。

### 🎨 体验优化

- 安装后**无需重启**，新装的组合包走 HMR 直接生效。

## 0.1.1 - 2026-10-01

### 🐛 问题修复

- 修正 `package.json` 里 `repository.url` 指向的仓库地址。
- `prepare` 改为 `prepack`：从 git 源安装时不再被 pnpm 拦截构建脚本。

### 📝 文档

- 安装章节改为 npm 优先，并补充从 GitHub 源安装的说明。

## 0.1.0 - 2026-10-01

### ✨ 新增功能

- 首版：两套主题（立绘 / 影画）、五个可调图层（侧栏立绘 / 背景氛围 / 左右贴底立绘 / 右下挂件）。
- 右下角画板：切换主题、逐层调节大小位置透明度，实时生效。
- **Q 版挂件** —— 七个官方表情可选，可拖到窗口任意位置。
- 「影画」主题背景提供六个候选，默认项跟随明暗（浅色 09 / 深色 08）。

[0.1.5]: https://github.com/xkxkiscoder/dsh-ui-zzz-sunna/releases/tag/v0.1.5
[0.1.4]: https://github.com/xkxkiscoder/dsh-ui-zzz-sunna/releases/tag/v0.1.4
[0.1.3]: https://github.com/xkxkiscoder/dsh-ui-zzz-sunna/releases/tag/v0.1.3
[0.1.2]: https://github.com/xkxkiscoder/dsh-ui-zzz-sunna/releases/tag/v0.1.2
