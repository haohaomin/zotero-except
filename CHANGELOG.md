# Changelog

## 1.0.3 — 2026-10-27

- 为 Windows、macOS、Linux 配置独立 CI 测试与 XPI 打包检查。
- 自动选择 Python 3 命令，显式使用 UTF-8，支持含空格和中文的构建路径。
- 统一 XPI 内部路径与 ZIP 元数据；测试可按操作系统查找 Zotero 或使用指定的存档路径。
- 补充 Windows 安装、开发和验收说明。运行时过滤逻辑不变，三平台共用同一 XPI。

## 1.0.2 — 2026-10-27

- 修复 Zotero 10 中 `Search.addCondition()` 参数变化导致条目列表加载失败。
- 增加过滤查询失败时回退到原始视图的保护。
- 增加 Zotero 更新清单和安装元数据。

## 1.0.1

- 补充 Zotero 安装器要求的 `applications.zotero.update_url`。

## 1.0.0

- 初始版本：在“我的文库”和“最近阅读”中隐藏 SettingsSync 配置条目。
