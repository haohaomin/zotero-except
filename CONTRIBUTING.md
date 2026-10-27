# Contributing

1. 使用 Node.js 运行 `npm test`。
2. 使用 `npm run build` 验证 XPI 构建。
3. 修改插件版本时，同时更新 `manifest.json`、`package.json` 和 `CHANGELOG.md`。
4. 发布前请在独立 Zotero 配置中验证“我的文库”“最近阅读”和 SettingsSync 集合三个场景。

Windows 开发环境：安装 Node.js 和 Python 3 后，可直接在 PowerShell 中运行上述命令。构建器依次尝试 `py -3`、`python`、`python3`；可设置 `ZOTERO_EXCEPT_PYTHON` 指向 Python 可执行文件（不要附加命令行参数）。安装插件的普通用户无需安装 Node.js 或 Python。

CI 在 Windows、macOS、Linux 上分别执行测试、打包和 ZIP 内容校验；这不等于 Zotero GUI 实机测试。依赖本地 Zotero 的两项源码回归测试在找不到安装时会明确跳过。自定义安装位置可设置 `ZOTERO_APP_ARCHIVE` 和 `ZOTERO_PLATFORM_ARCHIVE` 分别指向应用层、平台层的 `omni.ja`；它们应来自 Zotero 10.0.6，其他版本的源码结构可能不同。

插件依赖 Zotero 内部 API；请在代码中保留版本兼容性判断和失败回退，避免过滤器错误阻塞条目列表。
