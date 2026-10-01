# AGENTS.md

给 AI 编码助手的速查。人类读者：用法见 [README.md](README.md)，实现细节见
[DEVELOPING.md](DEVELOPING.md)。

## 协作约定

**禁止私自提交和推送。** 改文件、构建、测试、验证都可以照常做，但 `git add`、
`git commit`、`git push`、`git tag`，以及任何会触发 CI 的操作，都必须等仓库所有者
明确要求之后再执行。做完改动就停下来汇报：改了什么、动了哪几个文件、验证结果如何。
不要替仓库所有者决定什么时候入库。

## 项目

dsh 客户端的外观插件，作为组合包（bundle）被 Loader 加载，分两半：

| 半 | 入口 | 跑在哪 | 职责 |
| --- | --- | --- | --- |
| node | `src/index.ts` | dsh 主进程 | 把 `assets/` 挂成一条 http 路由 |
| client | `src/client/index.ts` | 浏览器 | token 覆盖层、样式表、图层元素、画板、启动动画 |

共享契约在 `src/paths.ts`：路由前缀 + 扩展名白名单，两半都从这里取，避免各自写一份而漂移。

## 改动的标准流程

```sh
npm run build     # 必须：prepare 已改为 prepack，本地 install 不再自动构建
```

然后：

- **只改了 `src/client/`** —— HMR 会自动重载页面，不用重启；
- **改了 `src/index.ts` 或 `src/paths.ts`** —— **必须重启 dsh**。这两处的代码只在启动时
  执行一次，热重载碰不到它们。

提交前跑 `npm run check`（测试 + 类型检查 + 构建）。

## 硬性约定

- 注释解释*为什么*，不复述代码在*做什么*。读完代码就能知道的事不要写进注释。
- 新增素材放 `assets/`，**同时**把扩展名加进 `src/paths.ts` 的 `ASSET_EXTENSIONS`。
- 改 `test/client.test.mjs` 的断言之前，先确认不是实现写错了。
- `tsconfig` 开了 `exactOptionalPropertyTypes`，可选属性要显式写 `| undefined`。

## 踩过的坑

**别往 profile 的 `cordis.patch.yml` 里手写 insert。**
本包自带的 `cordis.patch.yml` 已经声明了插件行，bundle 被选中时 Loader 会自动应用。
再补一条同 `id` 同 `name` 的条目，会让 `plugin-manager` 的 `removeBundle` 永远抛
`bundle-in-use` —— 它检查 Loader 里是否还有与 bundle 声明行同 id 同 name 的已激活条目，
而手写那条不受 bundles 增删影响。卸载流程是「从 `dsh.profile.bundles` 移除 → 卸载运行时
贡献 → `pnpm remove`」，第二步失败后面都不执行，包会一直留在 `dependencies` 里卸不掉。

**`webServer` 要用 `ctx.inject`，不要用 `ctx.get`。**
冷启动时 `ctx.get('webServer')` 可能返回 undefined，那样路由永远不会注册。症状极具
误导性：配色和画板都正常，只有图片 404，看起来像是素材坏了。

**CSS 自定义属性在声明它的元素上解析。**
把 `color-mix(...)` 发布到 `:root` 再在别处 `var()` 引用，混色按 `:root` 继承到的值算，
而不是引用处的值。需要按元素算就发布裸值，在目标元素自己的规则里组装。

**素材走 http 路由，不要内联 base64。**
换图只需替换 `assets/` 里的文件，不用碰 bundle。视频同理（`.mp4` 已在白名单里）。

## 发版

1. 改 `package.json` 的 `version`
2. 在 `CHANGELOG.md` **顶部**加一段 `## [x.y.z] - 日期`（CI 拿它当 Release 正文）
3. `git add -A && git commit -m "chore: release x.y.z" && git push`
4. `git tag vx.y.z && git push origin vx.y.z`

推 tag 后 GitHub Actions 会跑测试、构建、用 OIDC 发布到 npm，并从 CHANGELOG 取对应段落
建 Release。全程不需要 token 或 2FA。

`v0.1.0` 到 `v0.1.4` 已经发布过，不要移动这些 tag。
