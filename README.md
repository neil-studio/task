# Google Tasks 增强版看板 (Google Tasks Kanban Web App)

针对 Google Tasks 功能单一的问题，构建轻量、现代的纯前端单页 Web 应用（SPA），零后端依赖，直接部署于 GitHub Pages。通过浏览器直连 Google Tasks 官方 REST API，保持多端双向实时同步。

---

## 🌟 三大核心功能

1. **看板视图 (Kanban Board)**
   - **状态分栏**：支持按「待办 (To Do) / 进行中 (In Progress) / 已完成 (Done)」三栏组织任务，并在各状态间自由拖拽流转。
   - **清单并排**：支持将不同的 Google 任务清单并排为看板列，跨清单自由拖动整理。
   - **无缝映射**：智能将 `#doing`/`#wip` 标签与 Google Tasks 的 `needsAction`/`completed` 状态映射，兼顾原生兼容性与看板灵活性。

2. **子母任务体系 (Subtasks)**
   - **树状折叠**：基于 Google Tasks 原生 `parent` 字段，多层级子任务树状展示，支持一键展开/收起。
   - **进度条统计**：母任务卡片上实时显示完成度指标（如 `2/4 (50%)`）与渐变进度条（全部完成自动变为绿色）。
   - **快捷交互**：内联一键勾选完成子任务，即时更新母任务进度条；卡片内提供快速新建子任务输入框。

3. **标签系统 (Tags)**
   - **智能解析**：自动从任务标题及备注中提取 `#标签名`（支持中英文、数字、下划线及横杠）。
   - **彩色胶囊**：采用哈希算法为每个标签分配美观一致的柔和胶囊徽章。
   - **顶栏筛选器**：顶部标签条统计各标签任务频次，支持多标签交叉过滤与一键清空。

---

## 🛠️ 技术栈

- **构建与开发**：Vite 8 + React 19 + TypeScript
- **样式与设计**：Tailwind CSS v4 + Lucide React 图标
- **拖拽交互**：`@hello-pangea/dnd`
- **鉴权与 API**：Google Identity Services (GIS) OAuth 2.0 Token Client + Google Tasks REST API
- **部署发布**：GitHub Actions 自动构建并部署至 GitHub Pages

---

## 🚀 快速启动

### 1. 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev
```

启动后在浏览器打开：`http://localhost:5173/`

> **提示**：内置开箱即用的「**演示模式 (Demo Mode)**」，即便未配置 Client ID 也能直接体验看板拖拽、子母任务折叠与标签过滤！

### 2. 生产打包

```bash
npm run build
```

构建产物将输出在 `dist/` 目录中。

---

## 🔑 Google Cloud OAuth 2.0 配置说明

应用为纯前端架构，Client ID 仅保存在你的浏览器本地 `localStorage` 中：

1. 登录 [Google Cloud Console 凭据控制台](https://console.cloud.google.com/apis/credentials)。
2. 创建凭据 -> 选择「OAuth 客户端 ID」-> 应用类型选择「**Web 应用程序**」。
3. 在「**已获授权的 JavaScript 来源**」中添加你的访问地址：
   - 本地开发：`http://localhost:5173`
   - 生产环境：`https://<你的GitHub用户名>.github.io`
4. 在「已启用的 API 和服务」中搜索并启用 **Google Tasks API**。
5. 复制生成的 Client ID，点击应用右上角「设置」图标粘贴并保存，即可一键点击登录。

---

## 📦 部署到 GitHub Pages

项目已内置 `.github/workflows/deploy.yml` 自动化部署工作流：

1. 将代码推送到 GitHub 仓库的 `main` 分支。
2. 进入仓库设置：`Settings -> Pages -> Build and deployment -> Source`，选择 **GitHub Actions**。
3. 推送触发后，GitHub Actions 会自动编译并发布到 `https://<你的用户名>.github.io/<仓库名>/`。
4. `vite.config.ts` 已配置 `base: './'` 相对路径，在任意二级子路径下均可正常访问资源。
