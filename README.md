# 叶佑林 · 跨境电商设计组长个人作品集

黑白灰、键鼠外设主题的响应式网页模板。基于个人简历中的真实身份、经历与职责制作。第二版参考 CROX 的大字排版、工程网格与粗线框架，重构为外设视觉实验室。无构建步骤，无第三方 JavaScript 依赖。

同仓库还包含[网页设计分析工作台](design-analyzer/README.md)，可分析公开网页并生成可编辑的跨 Agent 建站提示词；其中网页实采功能需要 Node.js 与本机 Chromium。

## 预览

克隆本仓库到新电脑后，先安装 Node.js 20 或更新版本。然后在项目根目录执行：

```sh
npm install
npm run browser:install
npm start
```

作品集打开 http://127.0.0.1:4173 ，分析工作台打开 http://127.0.0.1:4173/design-analyzer/ 。`npm run browser:install` 为网页实采分析安装 Chromium。不能通过双击 HTML 使用 ES 模块，请用本地 HTTP 服务预览。

运行 `npm test` 可执行项目测试。静态作品集也能直接部署到 GitHub Pages；分析工作台的在线实采 API 需要运行 Node 服务，GitHub Pages 本身不支持该 API。其他电脑可通过 GitHub 仓库克隆、编辑并提交更改。

## 修改内容

修改 `site.config.js` 即可更新全站数据，不需要修改页面布局代码：

| 配置 | 修改范围 |
| --- | --- |
| `name / englishName / role` | 姓名与身份 |
| `email / phone / resumeUrl / resumePdf` | 联系信息与简历 |
| `theme` | 背景、正文、辅助文字与分隔线颜色 |
| `navigation` | 导航项与锚点 |
| `sections` | 模块顺序与开关；设置 `enabled: false` 隐藏 |
| `hero` | 首屏大字 `displayTitle`、描述、图片、跑马灯 `ticker`、键帽关键词 `keyThemes` |
| `work / projects` | 分类、案例卡片、项目详情与图片 |
| `impact` | 简历成果指标、描述与数据说明 |
| `about` | 简介、教育、任职经历与工作内容 |
| `capabilities` | 能力卡片、工具与工作流 |
| `contact` | 联系区标题与说明 |

新增项目：在 `projects` 数组复制一项，指定唯一的英文 `id`；`category` 应与 `work.filters` 中的类别一致。项目详情地址自动为 `#work/项目id`。`blocks` 可增加任意数量的正文区块。

作品画面通过 `artDirection` 选择 `brand`（品牌海报与浮动版式）、`commerce`（产品焦点与轨道）、`workflow`（深色渲染网格）三种编排；修改 `shortName`、`subtitle`、`code`、`deliverables` 即可更新展示大字、英文副标题、编号和详情交付模块。`image` 和 `alt` 分别是本地图片与替代文本。浮动海报的版式样例文本在 `components.js` 的 `ProjectVisual` 中修改。

模块渲染函数在 `components.js`，交互在 `app.js`，视觉与响应式样式在 `styles.css`。如果新增模块类型，将渲染函数注册到 `sectionComponents`，再把对应条目加入 `sections`。

## 内容真实性

- 身份、经历、公司、任职日期、教育及成果数字来自 [原始简历](https://yuliye0409-hue.github.io/ye-youlin-resume/)。
- 89.4%、63.6% 为原简历 4–5 月阶段记录，年份未标注；20% 为整体人效提升。CRV 平均提升 0.4% 保留原文口径，未擅自转换为百分点或其他指标。
- 本站的三个设计方向基于简历职责整理，属于展示框架，不冒充真实商业案例。简历没有提供真实项目图，目前使用摄影示意。正式作为作品集使用前，替换为本人的项目图与对应过程稿。
- 邮箱与电话均来自用户提供的公开简历。

## 图片与字体

外设照片来自 Unsplash，保存于 `assets/`，页面中统一转为灰度：

- 键盘：原图端点标识 photo-1618384887929-16ec33fab9ef
- 鼠标：原图端点标识 photo-1527814050087-3793815479db
- 银色键盘：原图端点标识 photo-1587829741301-dc798b83add3

原始图片端点分别为 `https://images.unsplash.com/` 加上上述 `photo-*` 标识。照片只是展示素材，不代表用户与照片中品牌存在合作关系。

字体使用 Google Fonts 的 DM Sans、Manrope 和 Noto Sans SC，并设置系统字体回退；断网仍能完整访问本地图片与内容。若需完全离线，移除 `styles.css` 第一行字体导入即可，或自行把合法字体文件放入 assets 并配置 @font-face。

## 交互与适配

- 导航锚点、当前位置提示、移动端自适应。
- 大字首屏、工程网格、滚动进度条、可悬停暂停的文字跑马灯。
- 四个立体键帽切换设计关键词，带按压反馈与无障碍状态播报。
- 作品分类筛选、画廊/目录双视图、图片轻微指针位移与悬停入口。
- 项目详情使用原生 dialog，包含职责、范围、交付模块、方法、细节和下一项目；支持焦点约束、Escape 关闭、hash 直达与历史前进后退。同一次详情浏览只占一个历史条目，切换下一项目后仍可一次返回作品区。
- 能力模块使用 ARIA Tabs，支持点击、方向键、Home 和 End；移动端自动改为水平选项布局。
- 经历使用原生 details 展开/收起。
- 邮箱复制与成功/失败反馈、电话、原简历及 PDF 链接。
- 减少动画偏好、键盘可访问、图片替代文本与打印样式。

没有默认播放音频，也未添加与个人身份无关的购物车或虚构商品售卖流程。

## 验证

执行 `node --test`（或 `npm test`）检查配置、独立模块渲染、禁用导航、项目路由、HTML 转义、媒体文件和原始成果口径。

浏览器验收包括桌面、平板与手机预览、分类筛选、双视图切换、键帽反馈、能力标签页键盘操作、详情 hash、下一项目、刷新恢复和关闭返回。运行环境若没有 npm，可直接运行 `node --test`。

## 部署

静态作品集及分析工作台界面通过 GitHub Actions 自动发布至 GitHub Pages；全部本地路径均为相对路径，可部署到仓库子路径。GitHub Pages 不会运行 `server.mjs`，所以网页实采分析仅在本机启动 Node 服务时可用。若要多人在线实采，需另行部署经过公网出口隔离与安全加固的分析 API。

GitHub 仓库：`https://github.com/yuliye0409-hue/ye-youlin-portfolio`

公开访问：`https://yuliye0409-hue.github.io/ye-youlin-portfolio/`

GitHub Pages 从 `main` 分支的根目录发布，`.nojekyll` 保持原生静态文件输出。后续修改后提交并推送到 `main`，GitHub Pages 会自动重新发布。
