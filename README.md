# dsh-ui-zzz-sunna

给 dsh 客户端换上一套《绝区零》千夏（Sunna）外观的主题插件。

两套主题、五个可调图层、一个能拖到任意位置的 Q 版挂件，全部在右下角的画板里实时调整，不用重启。

## 安装

```sh
dsh plugin --profile desktop add dsh-ui-zzz-sunna
```

装完重启 dsh。

**从源码装**

```sh
pnpm install && npm run build
dsh plugin --profile desktop add /绝对/路径/dsh-ui-zzz-sunna
```

## 界面预览

两套主题，各带浅色与深色两种形态。

**立绘** —— 侧栏立绘配同角色的柔化背景：

| 浅色 | 深色 |
| --- | --- |
| ![立绘 · 浅色](docs/preview-portrait-light.webp) | ![立绘 · 深色](docs/preview-portrait-dark.webp) |

**影画** —— 主视觉影画铺满背景，侧栏立绘默认关闭：

| 浅色 | 深色 |
| --- | --- |
| ![影画 · 浅色](docs/preview-overlay-light.webp) | ![影画 · 深色](docs/preview-overlay-dark.webp) |

右下角那个调色板图标就是画板，点开可以：

- **切换主题** —— 「立绘」与「影画」两套；
- **逐层调节** —— 侧栏立绘、背景氛围、左右贴底立绘、右下挂件，各自的大小、位置、透明度；
- **换挂件表情** —— 七个官方 Q 版表情任选；
- **换背景主视觉** —— 「影画」的主题背景有六个候选，默认项跟随明暗（浅色用 09、深色用 08）。

![Q 版挂件表情](docs/widgets.webp)

挂件可以直接**拖到窗口任意位置**。每套主题的数值分别保存，调坏一套不影响另一套。

## 许可

**CC BY-NC-SA 4.0** —— 署名 / 非商业 / 相同方式共享。**不允许任何商业用途。**

本包是同人二创，与 HoYoverse / miHoYo 及其关联公司无关联，也不代表它们认可本包。
角色与游戏名称属于各自权利人，本协议不授予任何商标或肖像使用权。

`assets/` 里的图是《绝区零》的官方素材，来源与授权审计见
[`assets/SOURCES.md`](assets/SOURCES.md)。
