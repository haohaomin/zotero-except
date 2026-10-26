# Contributing

1. 使用 Node.js 运行 `npm test`。
2. 使用 `npm run build` 验证 XPI 构建。
3. 修改插件版本时，同时更新 `manifest.json`、`package.json` 和 `CHANGELOG.md`。
4. 发布前请在独立 Zotero 配置中验证“我的文库”“最近阅读”和 SettingsSync 集合三个场景。

插件依赖 Zotero 内部 API；请在代码中保留版本兼容性判断和失败回退，避免过滤器错误阻塞条目列表。
