# LuminaRead 前后端代码架构与整洁规范（防止巨石代码）

你在编写、修改或重构本项目的前后端代码时，必须无条件遵循以下工程标准：

---

## 一、前端代码架构与整洁规范（React 19 / TypeScript）

### 1. 单文件行数硬性约束
- **组件文件规模**：任何组件单文件禁止超过 **300 行**代码。
- **函数/Hook 规模**：任何函数或自定义 Hook 禁止超过 **80 行**代码。
- **超限处理**：一旦代码量超过阈值，必须主动拆分子组件、抽取业务 Hook 或剥离独立辅助函数。

### 2. 严格的关注点分离（Separation of Concerns）
- **纯函数提取**：禁止在 UI 组件内部直接内联复杂的数据转换、格式化和清洗计算，必须提取至 `helpers.ts` 纯函数中并保持无状态。
- **业务 Hook 封装（Headless 逻辑层）**：复杂的异步请求、副作用、事件监听、轮询或组合状态必须封装为专属的 Custom Hook，组件层仅允许以声明式调用。
- **常量与配置剥离**：静态枚举、业务配置项、表单字段映射与默认值必须抽取至独立的 `constants.ts`。
- **类型契约隔离**：复杂数据模型、接口定义必须集中在 `types.ts`。

### 3. 性能优先与渲染隔离
- **状态就近原则（State Colocation）**：状态必须下沉至最贴近使用的最小子树节点，禁止滥用顶层状态提升，严禁让整个页面级大组件响应局部输入变化。
- **重型模块异步加载**：弹窗（Modal）、侧边抽屉（Drawer）、次要 Tab 及大型报表/图表等非首屏必要模块，必须默认采用 `React.lazy` + `Suspense` 动态按需加载。
- **细粒度状态订阅**：避免组件直接订阅全量宽泛 Context，优先使用选择器（Selector / 切片）或 Zustand 细粒度订阅，规避无意义的级联 Re-render。
- **重型实例显式释放**：PDF.js (`PDFDocumentProxy`)、Web Worker、Audio/ObjectURL 等非托管资源必须设置容量上限（LRU）并在卸载或淘汰时显式调用 `.destroy()` / `revokeObjectURL()`，严禁只增不减导致移动端内存溢出（OOM）。

---

## 二、后端 Rust 代码架构与工程规范（Axum / Tokio / SQLite）

### 1. 模块规模与防巨石约束
- **单文件行数上限**：任何 `.rs` 源码文件禁止超过 **400 行**（不含 `#[cfg(test)]` 单元测试模块）。
- **单函数行数上限**：任何函数或方法禁止超过 **80 行**。
- **职责拆分准则**：严禁将文本清洗状态机、外部网络协议客户端、SQL 语句拼装与业务编排塞入同一文件；超限时必须按职责拆分为子模块（如 `service.rs` + `provider.rs` + `sanitizer.rs`）。
- **拥抱生态与派生宏**：优先使用 `serde` 派生宏与标准库惯用法，禁止手写冗长的配置解析器、序列化拼接模板或重复样板代码。

### 2. 严格的四层架构边界（单向依赖）
后端严格遵循 `transport ➔ services ➔ domain ⬅ infra` 分层，严禁跨层越级调用：
- **`transport`（传输层 `transport/handlers/` & `router.rs`）**：仅负责 HTTP 参数提取、路径安全校验、HTTP Range/Header 协议封装与状态码映射。**严禁**在 Handler 中直接编写 SQL、执行业务状态转换或内嵌 HTML/SVG 渲染模板。
- **`services`（业务编排层 `services/`）**：负责业务逻辑编排、缓存生命周期管理、后台异步任务调度与外部服务（TTS / AI / 书源）调用。
- **`domain`（领域核心层 `domain/`）**：定义纯业务实体（`entities`）与仓储/服务 Trait 契约（`traits`），保持零框架与零 I/O 耦合。
- **`infra`（基础设施层 `infra/db/`, `infra/parser/`, `infra/storage/`）**：负责 SQLite 持久化实现、电子书格式解析（EPUB/PDF/MOBI/AZW3/TXT）与底层文件流操作。

### 3. 异步并发、流式 I/O 与数据库守则
- **严禁阻塞 Tokio 异步线程**：
  - 所有 SQLite 数据库操作必须通过 `DbContext::interact` 投递至受信号量限流的阻塞线程池执行。
  - 所有 CPU 密集型任务（电子书解压、PalmDOC LZ77 解压、HTML 转换、段落切分）及同步命令调用必须使用 `tokio::task::spawn_blocking`。
- **大文件流式处理（严禁全量载入内存）**：
  - 处理电子书文件（尤其百兆级扫描版 PDF / 插图版 AZW3）、分片上传与静态文件响应时，必须采用 `Seek`、`Read::take` 或 `ReaderStream` 按需流式读写，**严禁**对大文件直接调用 `read_to_end` 全量缓冲到 RAM。
- **SQLite 事务与写锁控制**：
  - 多表关联更新或级联删除必须包裹在显式事务（`conn.transaction()`）中。
  - 大批量数据写入（如 FTS5 段落索引构建）必须分批（Chunk）提交并在批次间调用 `tokio::task::yield_now().await`，防止长时间独占 WAL 写锁引发 `SQLITE_BUSY`。

### 4. 错误处理、安全性与资源闭环
- **零 Panic 准则**：生产业务代码中**严禁**出现 `.unwrap()`、`.expect()` 或无保护的切片下标访问（如 `&bytes[a..b]` 未校验边界），所有潜在错误必须通过 `?` 转换为 `AppError`（`DomainError` / `InfraError`）。
- **路径安全与原子写入**：
  - 所有含外部输入（`book_id`、文件名、哈希）的磁盘路径操作必须经过 `sanitize_path` 或严格白名单校验，杜绝路径穿越（Path Traversal）。
  - 并发缓存文件生成（如 PDF 页面栅格化、TTS 音频缓存）应采用临时文件写入后原子 `rename` 或 `Notify` 单飞（Singleflight）锁，防止并发撕裂读写。
- **资源级联清理闭环**：书籍派生的封面、正文提取插图、PDF 缓存及数据库子表（`book_paragraphs`、`book_fts`、`highlights`、`reading_progress`）必须按 `book_id` 严格归属，删除书籍时必须完整清理，杜绝跨书误删与磁盘孤儿文件。

---

## 三、全局检索与定位效率准则（防止 Token 浪费与盲目遍历）

- **查表定位优先**：收到任何功能改动、Bug 排查或流程问询时，**必须首先参考根目录下 `CODEBASE_MAP.md` 的【业务功能速查矩阵】**，精准锁定目标组件、Hook、Router、Service 与 Repo。
- **严禁全量盲搜**：严禁在未缩小范围的情况下在项目根目录发起无脑的全局递归搜索或大面积遍历文件。
- **单向链路排查**：严格按照 `UI (components) ➔ 业务逻辑 (hooks/stores) ➔ 接口契约 (api/types) ➔ 路由与处理器 (router/handlers) ➔ 领域服务 (services) ➔ 基础设施 (infra/db & infra/parser)` 单向精准跳转。

