# 开发说明

面向要改这个包的人。安装与使用见 [`README.md`](README.md)。

本包是仓外插件，两条 half、三条注入路径：

- **token 覆盖层**（client）—— 通过 `ctx.theme.overrideTokens()` 把一组 `--dsw-alias-*`
  变量叠加到当前生效的主题上。基础色板、用户选的 light/dark/system 偏好、字号全部不动；
  ui-theme 把覆盖层折进快照，ui-layout 的 presenter 应用到文档上。
- **资产路由**（node）—— 把本包 `assets/` 目录挂成一条 http 路由，供浏览器按 URL 取图。
  所以素材不内联，换图不用碰 base64。
- **定向样式表 + 图层元素**（client）—— 四处 token seam 够不到的表面：背景混合层、
  左右全身立绘、Q 版挂件，以及浅色模式下右侧面板的发色底（该面板和会话列共用
  `--dsw-alias-bg-base`，没有独立槽位）。

五个图层槽位（侧栏立绘 / 背景氛围 / 左右贴底立绘 / 右下挂件）和"每层用哪套素材"都在
`src/client/slots.ts` 的 `LAYERS` 与 `THEMES` 里。右下角画板可以在运行时切换主题、单独调
每一层，不用重启也不用重新构建。

## 配色来源

配色取自《绝区零》千夏（Sunna）的立绘与角色页
（[wiki.biligame.com/zzz/千夏](https://wiki.biligame.com/zzz/%E5%8D%83%E5%A4%8F)），
不是任意选的一组好看颜色。映射关系：

| token | 角色依据 |
| --- | --- |
| `brand-primary` 青绿 `#08776F` / `#3FD0BC` | 薄荷绿发 + 头顶青绿翼形发饰，她的识别色 |
| `label-*`、`border-*` 冷薄荷灰 | 发色家族，而非中性灰 |
| `sidebar-fill` 极淡玫瑰色 | 粉色是她的舞台装束而非身份色，所以只做底色点缀，不当强调色 |
| `state-error` 红 `#C2364A` / `#F06A7C` | 领口红领结 |
| `state-success` 草绿 `#27752F` / `#4ECB6A` | 发的薄荷绿向草绿偏移，避免与 brand 混淆 |
| `state-warn` 金 `#975F06` / `#E9B43C` | 金色糖果与波点 |
| light 底 近白 | 白衬衫与背后白色天使翅膀 |
| dark 底 `#0C1514` | 发色压在阴影里 |

浅色模式是她的本体观感，深色模式是把同一套绿压在夜色里；两种模式下的 accent 全部通过
WCAG（见「本地校验」）。

## 立绘、挂件与右侧面板

这几处不在 token seam 里，由 `src/client/skin.ts` 生成的样式表加 `src/client/index.ts`
创建的元素处理。

**背景**（两个模式都有）：每个 app 表面都画着不透明的 `--dsw-alias-bg-*` token，塞在 app
树下面的图片看不见。背景因此作为屏幕空间混合层浮在最上层（`body::after`，
`pointer-events: none`，`z-index: 9998`），两种模式各取一个能在自己底色上活下来的混合方式：
浅色 `multiply`，深色 `screen`（在 `slots.ts` 的 `BACKGROUND_BLEND`）。

强度就是画板里那个"透明度"滑块本身：**100% 等于真正的不透明**，没有隐藏系数；默认 20%，
因为再往上它就从氛围变成跟正文抢注意力了。两种模式共用同一个强度值，差别只来自混合方式。

背景必须是 `body::after` 而不是一个 div：`mix-blend-mode` 只在与最近的堆叠上下文的背景之间
合成，包一层容器就会把它隔离成一张不合成的普通图。左右立绘和挂件是真实元素，因为它们不需要混合。

**侧栏立绘**：不额外建元素。它画在侧栏根元素自己的背景层上（填充色之上、列表之下），图上面盖
一层同色 wash 来保住文字对比度 —— 画板里的"透明度"滑块调的正是这层 wash 的强度，所以拖低它
人物变淡、拖高它人物变清楚，而列表文字始终清晰。

**左右立绘**：真实元素，`position: fixed` 贴底，盒子各占 `46vw`（`max-width: 640px`），
`background-size: contain`，`z-index: 9999`，`pointer-events: none`。高度、向内偏移和
不透明度各自由画板写入的变量控制，左右可以完全不同。

**挂件**：`z-index: 10000`，可拖动，是唯一接收指针事件的表面。

**素材怎么到浏览器**：web shell 走本地 http 服务，页面里 `file://` 取不到，而
`overrideTokens` 只传 CSS 值、传不了资源。所以本包的 node half 注册一条 `prefix` 路由
`/dsh-ui-zzz-sunna/assets/`，服务包内 `assets/` 目录（`src/index.ts`，带扩展名白名单 +
路径穿越检查）。可用格式：`.webp` `.png` `.gif` `.jpg` `.jpeg` `.svg`；其他扩展名一律 404。

路由用 `ctx.inject(['webServer'], …)` 而不是一次性 `ctx.get('webServer')`：一次读取只在
webserver 恰好已经就绪时成立，冷启动时这一半可能先跑，于是路由永远不注册 —— 症状很有迷惑性，
颜色和画板都正常，只有图片 404。没有 webserver 的 profile 照样能装本包并拿到品牌色板，只是没有图层。

**右侧面板**（仅浅色模式）：该面板的盒子（`ui-sidebar-right` 的 `.panel`）读
`--dsw-alias-bg-base`，和背后的会话列是同一个 token，所以 alias seam 无法给它独立颜色。
打开时它会挂 `data-sidebar-right-open`，这是一个稳定钩子；在浅色模式下于该元素上重声明整组
token，让整个子树落到发色上：

| 变量 | 值 | 与底色的对比度 |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#73CAC0` 发色中间调 | — |
| `--dsw-alias-label-primary` | `#0B241F` | 8.5:1 |
| `--dsw-alias-label-secondary` | `#1F3E37` | 6.1:1 |
| `--dsw-alias-label-tertiary` | `#274941` | 5.2:1 |
| `--dsw-alias-label-caption` | `#274941` | 5.2:1 |
| `--dsw-alias-border-l4` | `#57B5A2` | 装饰细线 |

原调色板里的灰色在这块底色上是 2.5-3.7:1，必须一起压深，否则面板里的提示文字直接消失。
`border-l4` 也要换：面板盒子自己画左边框，不换会留一条中性灰的接缝。

## 主题与图层

外观分成两层概念，都在 `src/client/slots.ts`：

- **图层（`LAYERS`）** —— 结构：五个槽位各自的标签、大小范围、位置含义，以及主题没有覆盖时
  使用的基线几何。
- **主题（`THEMES`）** —— 一套素材：每个槽位画哪张图（浅色 / 深色各一），以及这套素材想要的
  起始大小、位置、透明度。

右下角画板可以**运行时切换主题**，不需要重启、也不需要重新构建：素材本来就是以自定义属性
（`--dsz-<层>-image`）发布的，切换只是改写这些变量的值。每套主题的几何值在 `localStorage`
里各存一份，调坏一套不影响另一套。

### 新增一套主题

1. 把图放进 `assets/`。透明立绘**建议先裁掉画框空白**（见
   [`assets/SOURCES.md`](assets/SOURCES.md) 的处理方式一节）—— 侧栏按画框高度算大小，
   留白越多、同一个尺寸下人物越小；底部留白还会让脚底浮在列底之上，而悬浮量随尺寸变化，
   用一个百分比位置补不回来。
2. 在 `THEMES` 里追加一个 `ThemePack`：

```ts
{
  id: 'night',              // 唯一即可，画板拿它当存储键
  label: '夜色',             // 画板上的按钮文字
  layers: {
    sidebar: {
      file: 'sunna-04-uniform.webp',
      // fileDark 省略 = 深浅共用这一张；设为 null = 只在深色模式下隐藏
      defaults: { visible: true, size: 68, position: 100, opacity: 45 },
    },
    background: {
      file: 'sunna-09-art.webp',
      // 同一构图的暗色版：浅色底要 multiply 的亮图，深色底要 screen 的暗图
      fileDark: 'sunna-08-art.webp',
      defaults: { visible: true, size: 110, position: 90, opacity: 45 },
    },
  },
}
```

3. 只写这套主题真正用到的层：没写的层没有素材（画板里显示"本主题无素材"），几何退回
   `LAYERS` 的基线值。`defaults` 同理，可以整块省略。
4. `npm run build`，然后重启 `dsh`。

`THEMES` 的第一项是默认主题：`skin.ts` 会把它烘成样式表里的兜底值，所以在画板还没挂载的
那一瞬间（或整个 profile 里没有画板时）画出来的也是它。

### 槽位与几何

| 层 id | 画板标签 | 大小范围 | 位置含义 | 落点 |
| --- | --- | --- | --- | --- |
| `sidebar` | 侧栏立绘 | 10–150 | 纵向位置 | 侧栏根元素的背景层 |
| `background` | 背景氛围 | 30–220 | 横向位置 | 屏幕空间混合层 `body::after` |
| `left` | 左贴底立绘 | 20–130 | 向内偏移 | 贴底元素 |
| `right` | 右贴底立绘 | 20–130 | 向内偏移 | 贴底元素 |
| `pet` | 右下挂件 | 40–220 | 边距（可拖动） | 右下角方图 |

层 id 同时是自定义属性的中缀：画板写
`--dsz-<id>-image|image-dark|size|pos|opacity|dark-scale|dark-pos`，`skin.ts` 读它们。

`fileDark` 必须是**另一个文件**，不能靠 `scaleX(-1)`：侧栏立绘画在侧栏根元素自己的背景层上，
transform 会把整个侧栏连同列表一起镜像。

### 图层变体

一个图层可以列出一组 `variants`，画板就会在该层里显示一排小色块让人挑。列表可以放在**两个
地方**，取决于这份选择属于谁。

**放在图层上** —— 属于角色、每套主题都该有的选择（挂件的七个表情）：

```ts
{
  id: 'pet',
  label: '右下挂件',
  variants: [
    { file: 'sunna-14-chibi-shy.webp', label: '害羞' },
    { file: 'sunna-14-chibi-confident.webp', label: '自信' },
    // …
  ],
  defaults: { visible: true, size: 120, position: 24, opacity: 100, variant: 4 },
}
```

**放在主题的层上** —— 只在某套主题下成立的选择（「影画」主题的背景用哪张主视觉）。
主题的列表优先：

```ts
{
  id: 'overlay',
  label: '影画',
  layers: {
    background: {
      file: 'sunna-09-art.webp',
      fileDark: 'sunna-08-art.webp',
      variants: [
        // 固定顺序。第一项是默认：浅色用 09、深色用 08（由 fileDark 表达）。
        // 它的色块换成了一张拼合图，否则会和下面的「亮」撞脸。
        { file: 'sunna-09-art.webp', fileDark: 'sunna-08-art.webp', swatch: 'sunna-bg-auto.webp', label: '跟随明暗 · 浅 09 / 深 08' },
        { file: 'sunna-07-art.webp', label: '意象影画 · 绿粉' },
        { file: 'sunna-08-art.webp', label: '意象影画 · 暗' },
        { file: 'sunna-09-art.webp', label: '意象影画 · 亮' },
        // …
      ],
      // 只写要改的字段：主题的 defaults 会合并到层基线之上，不是替换。
      defaults: { variant: 0 },
    },
  },
}
```

几个要点：

- 有变体的层以选中的变体为准，`file` 只在"没列变体"时才用得上；
- **`swatch` 只影响色块显示**，选中后实际用哪张图仍由 `file`/`fileDark` 决定。想做"跟随明暗"
  的默认项就需要它：那张图在两种模式下不一样，一个缩略图表达不了，而直接借用其中一张又会和它
  自己的项撞脸；
- **一项一个色块**。若两项的色块相同（`swatch` 相同，或缺省时 `file` 相同），选中态就看不出来了，
  这条由测试守住；
- 一个"跟随明暗"的项**必须是独立的一项**。若让默认项同时兼任某张图的项，那么在深色底色下点它
  等于回到默认，永远只能得到暗色那张 —— 这正是"深色下切 08/09 没反应"的成因；
- `defaults.variant` 是默认下标（从 0 起），画板在那一项下面画个圆点；越界会被测试挡下；
- 主题的 `defaults` 是**合并**而非替换，所以只想挪默认下标时写 `defaults: { variant: 0 }` 即可，
  基线的大小、位置、透明度都不会丢。

### 版式开关

`ThemePack` 上还有一个可选字段，控制的是版式而不是素材：

- `flushSidebar: true` —— 侧栏不再画自己那层极淡的填充色，而是取内容区的颜色，两者之间用一条
  1px 的线分隔（影画主题用的就是这个）。背景本来就已经铺满整个页面时，再叠一层侧栏填充色会跟它打架。

### 深色单独调

两张立绘如果画框填充率差得多（典型的是一张裁过、一张没裁），同一个 `size` 就会显示出不同身高。
`darkDefaults: { scale, position }` 就是给深色那张的额外缩放与纵向位置，对应画板里的
"深色大小 / 深色位置"两个滑块。素材都裁干净时保持 `{ scale: 100, position: 100 }` 即可。

## 改配色

所有颜色集中在 `src/client/tokens.ts` 的 `TOKENS`。每个 token 必须是 `{ light, dark }` 一对值，
裸字符串会被 `overrideTokens` 直接拒绝。

```ts
'--dsw-alias-brand-primary': { light: '#08776F', dark: '#3FD0BC' },
```

可用 token 名以 `ctx.theme.exportInspectTokens()` 为准。写错名字不会被拒绝，只是什么都不改变 ——
`test/client.test.mjs` 里的名字形状检查是唯一的防错网。

右侧面板的发色、标签梯度和边框在 `src/client/skin.ts` 的 `SKIN_PANEL_LIGHT`，底色与每个字色
一起改，`test/client.test.mjs` 会检查这一组的 WCAG。背景的 `mix-blend-mode` 和不透明度模板也在
同文件的 `buildSkinCss()`，数值来自 `slots.ts` 的 `BACKGROUND_BLEND`。

### 内容底色的透明度

对话里的代码块、行内代码和工具卡片（读文件 / 搜索 / 终端 / 差异 / JSON）画的是同一族别名 token
（`--dsw-alias-markdown-code-block`、`-banner`、`-inline-code`），所以画板里那一个滑块就管到了全部，
不需要按组件写选择器 —— 第一方改了哈希类名也不受影响。

覆盖值由 `tokens.ts` 的 `contentBlock()` 造出，形如
`color-mix(in srgb, var(--dsw-static-*) var(--dsz-content-bg, 100%), transparent)`。三条约束不能动：

- **只读 `--dsz-content-bg` 这个名字。** 画板把它写在 `:root`，token 值在 `body` 上读，两边拼错就是
  "滑块拖得动、画面不动"，而且不报任何错 —— 所以名字是 `slots.ts` 里的
  `CONTENT_BG_VARIABLE`，两边都从那里取。
- **底色引用 `--dsw-static-*`，不能引用 `--dsw-alias-markdown-*` 自己。** 主题 token 是被
  `ui-layout` 的 presenter 以**行内样式**落在 `body` 上的，而自定义属性在声明它的元素上自引用就是
  循环；循环等于 guaranteed-invalid，代码块会直接丢掉整块底色，而不是"停在原来的不透明上"。
  静态色板和这些别名都声明在 `body`，所以引用的解析位置和覆盖落点是同一个元素。
- **三个 token 要一起改。** 只动 `-code-block` 会让代码块半透明而标题栏照旧是不透明的一条。

`CONTENT_BG_DEFAULT`（100）同时是滑块初值和 CSS 兜底：画板从没挂载过的时候，内容段保持第一方
原本的样子。值在 `localStorage` 里全局一份、不按主题分，因为它是可读性设置而不是外观的一部分。

## 本地校验

```sh
npm run test        # node:test：token 名形状、light/dark 成对性、WCAG 对比度、
                    # 样式表的模式门、面板字色对比度；主题 id 唯一、未知 id 回落到默认、
                    # 每套主题都有素材、素材文件真实存在且扩展名可服务、
                    # 变体的色块互不重复、默认下标在范围内、
                    # 内容底色确实是"被画板稀释的静态色"而不是自引用或写死色
npm run typecheck   # tsc --noEmit
npm run build       # tsc 出 lib/types 声明，tsdown 从 src/ 出 lib/index.js 与 lib/client.js
```

改完 `slots.ts`、`assets/` 或 `panel.ts` 后必须 `npm run build` 再重启。资产路由是 node half
注册的路由，走真实 http，可以用 curl 单独验证：

```sh
curl -sI http://127.0.0.1:<端口>/dsh-ui-zzz-sunna/assets/portrait.webp
```

## 已知限制

- **这是非官方的角色演绎配色。** 颜色按公开立绘取样并按角色设定映射，不是官方品牌色卡；
  二次创作展示没问题，不要当官方物料发布。
- **粉色只落在侧栏底色上。** 千夏的服装大面积是粉，但 ui-theme 的语义槽位里只有一个强调色
  （`brand-primary`），所以粉被压成一层很淡的表面色，不承载强调语义。要让粉成为真正的第二
  强调色，得改第一方新增槽位，不在本包范围内。
- **图层与资产路由耦合第一方结构。** `[data-sidebar-right-open]` 是 `ui-sidebar-right` 的
  属性名，`multiply`/`screen` 混合依赖基础背景保持不透明，资产路由依赖 `webServer` 服务的
  `prefix` 路由注册，侧栏立绘依赖栏内的 DOM 形状（`slots.ts` 里那条 `:has(...)` 选择器）。
  这些任一改动，对应效果会静默失效 —— 回来改本包，不要去改 shell。`test/client.test.mjs`
  只检查选择器字符串还在，验不了语义。
- **图层浮在所有层级之上。** `z-index` 9998/9999/10000 高于弹层（20）、全屏面板（40）和
  浮动面板（60），所以背景混合会给弹窗、tooltip 上一层很淡的色，立绘和挂件会压在右侧面板上。
  `pointer-events` 全部关闭，不影响交互；觉得盖得太狠就在画板里调低该层的不透明度。
- **窄窗口下立绘会压住会话列。** 立绘盒子各占 `46vw`（写死在 `skin.ts` 的
  `.dsz-sunna-figure`），两侧加起来超过屏幕时就直接叠在中间内容上。想只留一侧就在画板里关掉
  另一层，或者改那个 `width`。
- **面板发色只有浅色模式。** 深色模式下面板保持原底色。深色底下的发色中间调会太亮，要做出对的
  深色版本得另取一套压暗的发色梯度。
- **画板本身没有国际化。** 标签是写死的中文，跟着包走。
- **首屏不会立刻是品牌色。** ui-theme 的 pre-plugin bootstrap 只写基础偏好与字号，品牌覆盖层
  要等本包的客户端 bundle 加载后才生效，所以浅底深底切换的瞬间会先闪一下未叠加的 token。
- **设置里没有开关。** 第三方覆盖层不产生可切换的 theme id，也不进 `ui-theme` 的持久化 schema，
  用户在 Settings 里仍然只能选 light/dark/system。本包的主题切换在右下角画板里，不经过 Settings。
- **token 名单不跟随升级。** `exportInspectTokens()` 的名单由 ui-theme 拥有，本包只按快照值使用；
  ui-theme 改名或新增 token 时本包不会自动感知，需要手动比对。
- **别往 profile 的 `cordis.patch.yml` 里手写 insert。** 本包自带的 `cordis.patch.yml` 已经声明了
  插件行，bundle 被选中时由 Loader 自动应用；`dsh plugin add` 只写 profile 的 `dependencies` 与
  `dsh.profile.bundles`，不碰 patch 层（全新 profile 里那文件是空的 `[]`）。再补一条同 `id` 同
  `name` 的条目，会让 `plugin-manager` 的 `removeBundle` 永远抛 `bundle-in-use`：它检查 Loader 里
  是否还有与 bundle 声明行同 id 同 name 的已激活条目，而手写的那条不受 bundles 增删影响。卸载流程
  是「从 `dsh.profile.bundles` 移除 → 卸载运行时贡献 → `pnpm remove`」，第二步失败后面都不执行，
  包会一直留在 `dependencies` 里卸不掉。
