# Zotero Except

[![CI](https://github.com/renhao12356578/zotero-except/actions/workflows/ci.yml/badge.svg)](https://github.com/renhao12356578/zotero-except/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/renhao12356578/zotero-except?display_name=tag)](https://github.com/renhao12356578/zotero-except/releases)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)

一个面向 Zotero 7–10 的轻量插件，用于把 Zotero Settings Sync 的内部配置条目从聚合视图中隐藏。

在“我的文库”和“最近阅读”中隐藏 `[SettingsSync] DO NOT DELETE` 集合内的配置条目。

## 安装

1. 从 [Releases](https://github.com/renhao12356578/zotero-except/releases) 下载最新的 `.xpi` 文件（不要下载 Source code zip）。
2. 打开 Zotero → 工具 → 插件。
3. 在插件管理器齿轮菜单中选择“从文件安装插件”。
4. 选择下载的 `.xpi` 文件，安装后重启 Zotero。

1.0.2 修复 Zotero 10 已移除 `Search.addCondition()` 第四个 `required` 参数造成的列表加载错误。新的外层搜索默认按 AND 组合条件，无需旧参数。增加构建/执行过滤查询失败时回退到原始视图的保护，此时配置条目可能重新显示，但正常文献仍可访问。

1.0.1 修复安装清单缺少 `applications.zotero.update_url` 导致 Zotero 10.0.6 拒绝安装的问题。此个人版本没有更新服务器，使用保留的 `.invalid` 域名满足清单要求；自动检查不会取得更新，后续版本需手动安装。

## 行为

- 精确匹配个人文库中名为 `[SettingsSync] DO NOT DELETE` 的集合，包括其子集合。
- 只对个人文库根视图和最近阅读生效，包括这些视图内的搜索和标签筛选。
- 配置条目及其子附件/笔记被排除；正常文献保持可见。
- 左侧 SettingsSync 集合仍然保留，直接点击集合可查看配置。其他普通集合、已保存搜索、群组文库和回收站不受影响。
- 若条目同时属于 SettingsSync 和普通集合，在以上两个聚合视图中仍会隐藏。
- 不删除、移动或修改文库条目，不修改最近阅读记录，不拦截 SettingsSync 的数据 API。
- 停用或卸载后恢复显示。过滤逻辑没有网络请求、额外依赖或持久化设置；Zotero 自身可能尝试访问清单中的更新地址。

## 实现及验证范围

使用 Zotero 引导式插件生命周期，在 `CollectionTreeRow.getSearchObject` 外增加独立的排除搜索作用域，保持原始搜索及缓存不变；启用搜索模式保证增量新增也走过滤查询。集合/条目通知触发延迟刷新，停用时恢复接口和显示。

清单允许 Zotero 7–10.0。已核对 Zotero 当前上游的集合搜索、子条目排除及通知接口，并通过 11 项自动化测试。其中直接提取本机 Zotero 10.0.6 的实际 `addCondition` 方法，复现旧版异常并验证新版构建条件成功；其他依赖采用测试桩，未执行真实数据库查询。尚未在真实 Zotero 中安装验收，因此较旧版本和第三方插件组合仍需实测。

## 隐私与安全

插件只读取本地集合和条目查询状态，不上传文库内容、不访问网络 API，也不删除或移动条目。Zotero 可能按插件清单检查 `updates.json`；更新文件仅用于检查新版本，不包含文库数据。

插件拥有 Zotero 插件运行环境的权限。安装前请阅读源码；问题和安全报告请参见 [SECURITY.md](SECURITY.md)。

## 发布维护

版本号同时维护在 `manifest.json` 和 `package.json`。运行 `npm test` 检查代码，运行 `npm run build` 生成 `dist/zotero-except-<version>.xpi`。推送形如 `v1.0.2` 的 tag 会触发 GitHub Actions，重新构建 XPI、生成 SHA-256 校验值并创建 GitHub Release。Release 资产是插件安装包，仓库源码压缩包不是安装包。

插件市场提交使用 [Zotero Plugins Atlas](https://zoteroplugins.org/submit)，这是独立于 Zotero 官方的社区目录；其流程会先检查公开仓库 Release 中是否存在 `.xpi`，然后进行代码检查。

参考：[官方插件开发文档](https://www.zotero.org/support/dev/zotero_7_for_developers)、[集合视图查询源码](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/collectionTreeRow.js)、[搜索引擎源码](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/data/search.js)。

## 开发

运行 `npm test` 测试，运行 `npm run build` 生成 XPI（需 Node.js 和 Python 3，无需安装 npm 依赖）。

手动验收：安装后分别进入我的文库、最近阅读和 SettingsSync 集合；验证前两者无配置条目且普通文献可见，后者保留配置。测试在 SettingsSync 集合新增/移出条目、重命名集合、多窗口和停用插件后的显示恢复。确认 SettingsSync 自身仍可同步配置。
