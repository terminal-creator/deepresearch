# 行业信息助手 - 开发进度跟踪

你如果要开发前端页面，一定要和现在风格一致

> 状态说明：
> - ⬜ 未开始
> - 🔨 开发中
> - ✅ 开发完成
> - 🧪 测试中
> - ✔️ 测试通过
> - ❌ 测试失败

---

## 一、基础工程

### 1.1 环境配置
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 后端 .env 配置 | ✅ | ✔️ | 包含所有 API Key |
| 前端 .env 配置 | ✅ | ✔️ | API 地址配置 |
| requirements.txt | ✅ | ✔️ | Python 依赖 |

### 1.2 Docker 部署
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| docker-compose.yml | ✅ | ✔️ | PostgreSQL/Redis/Milvus |
| 数据库初始化脚本 | ✅ | ✔️ | docker/init-db/01-init.sql |
| 启动脚本 start-services.sh | ✅ | ✔️ | 一键启动中间件 |

### 1.3 数据库设计
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| users 用户表 | ✅ | ✔️ | |
| chat_sessions 会话表 | ✅ | ✔️ | |
| chat_messages 消息表 | ✅ | ✔️ | |
| knowledge_bases 知识库表 | ✅ | ✔️ | |
| documents 文档表 | ✅ | ✔️ | |
| long_term_memories 长期记忆表 | ✅ | ⬜ | |
| Text2SQL 示例数据表 | ✅ | ✔️ | 餐饮/股票/法律/交通 |

---

## 二、用户认证系统

### 2.1 后端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| core/database.py 数据库连接 | ✅ | ✔️ | SQLAlchemy |
| core/security.py JWT认证 | ✅ | ✔️ | python-jose |
| core/redis_client.py Redis客户端 | ✅ | ✔️ | |
| models/user.py 用户模型 | ✅ | ✔️ | |
| models/chat.py 聊天模型 | ✅ | ✔️ | |
| models/knowledge.py 知识库模型 | ✅ | ✔️ | |
| schemas/user.py 用户Schema | ✅ | ✔️ | |
| router/auth_router.py 认证路由 | ✅ | ✔️ | |
| POST /auth/register 注册接口 | ✅ | ✔️ | |
| POST /auth/login 登录接口 | ✅ | ✔️ | |
| GET /auth/me 获取用户信息 | ✅ | ✔️ | |
| POST /auth/change-password 修改密码 | ✅ | ✔️ | |

### 2.2 前端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| api/auth.ts 认证API | ✅ | ✔️ | |
| store/auth.ts 认证状态 | ✅ | ✔️ | valtio |
| pages/auth/login.tsx 登录页面 | ✅ | ✔️ | 登录+注册 |
| plugins/auth.ts Token注入 | ✅ | ✔️ | 请求拦截器 |
| 路由配置 /login | ✅ | ✔️ | |

---

## 三、对话历史持久化

### 3.1 后端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| schemas/chat.py 聊天Schema | ✅ | ✔️ | SessionCreate/Update/Response, MessageCreate/Response |
| router/session_router.py 会话路由 | ✅ | ✔️ | |
| GET /sessions 获取会话列表 | ✅ | ✔️ | 支持分页和类型筛选 |
| POST /sessions 创建会话 | ✅ | ✔️ | |
| DELETE /sessions/:id 删除会话 | ✅ | ✔️ | |
| PUT /sessions/:id 更新会话标题 | ✅ | ✔️ | |
| GET /sessions/:id/messages 获取消息 | ✅ | ✔️ | |
| POST /sessions/:id/messages 添加消息 | ✅ | ✔️ | 自动更新会话标题 |

### 3.2 前端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| api/session.ts 会话API | ✅ | ✔️ | |
| store/session.ts 会话状态 | ✅ | ✔️ | valtio |
| SessionDrawer 组件 | ✅ | ✔️ | 对话历史抽屉 |
| 对话列表展示 | ✅ | ✔️ | |
| 对话切换功能 | ✅ | ✔️ | |
| 对话删除功能 | ✅ | ✔️ | |
| 对话重命名功能 | ✅ | ✔️ | |

---

## 四、知识库模块

### 4.1 后端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| DocMind 文档解析服务 | ✅ | 🧪 | 阿里云 API - service/docmind_service.py |
| Milvus 向量存储服务 | ✅ | ✔️ | service/milvus_service.py |
| 文档切分策略 | ✅ | 🧪 | 基于###/##切分 |
| 文本向量化 | ✅ | ✔️ | text-embedding-v4 (1024维) - service/embedding_service.py |
| 检索服务 | ✅ | ✔️ | service/retrieval_service.py |
| router/knowledge_router.py | ✅ | 🧪 | 完整CRUD实现 |
| POST /knowledge-bases 创建知识库 | ✅ | 🧪 | |
| GET /knowledge-bases 获取知识库列表 | ✅ | 🧪 | |
| DELETE /knowledge-bases/:id 删除 | ✅ | 🧪 | |
| POST /documents/upload 上传文档 | ✅ | 🧪 | 后台异步处理 |
| GET /documents 获取文档列表 | ✅ | 🧪 | |
| DELETE /documents/:id 删除文档 | ✅ | 🧪 | |

### 4.2 前端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 左侧导航添加知识库入口 | ✅ | ✔️ | layout/base/nav.tsx |
| 知识库管理页面 | ✅ | 🧪 | pages/knowledge/index.tsx |
| 文档上传组件 | ✅ | 🧪 | 支持拖拽上传 |
| 文档列表展示 | ✅ | 🧪 | 带状态标签 |
| 文档处理状态显示 | ✅ | 🧪 | 轮询刷新机制 |

### 4.3 聊天附件上传
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| ChatAttachment 数据模型 | ✅ | 🧪 | models/chat.py |
| 聊天附件上传接口 | ✅ | 🧪 | router/attachment_router.py |
| 基于附件的问答 | ✅ | 🧪 | router/chat_router.py - /chat/completion/v3 |
| 前端附件上传UI | ✅ | 🧪 | components/sender - 附件Tag展示 |

---

## 五、DeepResearch 优化

### 5.1 核心算法 - V1 (ReAct 架构)
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| ReAct 决策循环 | ✅ | ✔️ | service/react_controller.py |
| 工具执行器 | ✅ | ✔️ | service/tool_executor.py |
| 多轮迭代深度搜索 | ✅ | ✔️ | dr_g.py |
| 智能子问题分解 | ✅ | ✔️ | |
| 信息综合与去重 | ✅ | ✔️ | 语义去重 |
| 答案质量评估 | ✅ | ✔️ | 反思机制 |

### 5.2 核心算法 - V2 (多智能体协作)
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| ChiefArchitect 规划Agent | ✅ | 🧪 | 假设驱动+大纲生成 |
| DeepScout 搜索Agent | ✅ | 🧪 | 信源追溯+去重 |
| CodeWizard 分析Agent | ✅ | 🧪 | 自我修正代码执行 |
| LeadWriter 写作Agent | ✅ | 🧪 | 分章节撰写 |
| CriticMaster 审核Agent | ✅ | 🧪 | 对抗式质检 |
| LangGraph 状态机 | ✅ | 🧪 | 工作流编排 |
| 知识图谱构建 | ✅ | 🧪 | 实体关系抽取 |

### 5.3 搜索引擎
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| Bocha 搜索 API 集成 | ✅ | ✔️ | api.bochaai.com |
| 多源搜索聚合 | ✅ | ✔️ | 网络+知识库 |
| 搜索结果智能排序 | ✅ | ✔️ | DashScope Rerank |
| 搜索缓存机制 | ✅ | ✔️ | 内存缓存 |

### 5.4 结果展示
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 图片搜索和展示 | ⬜ | ⬜ | |
| 图表生成 | ✅ | 🧪 | ECharts - service/chart_generator.py |
| 智能数据分析 | ✅ | 🧪 | service/smart_analyzer.py |
| Markdown 渲染优化 | ✅ | ✔️ | 前端 MarkdownRenderer |

---

## 六、长短期记忆系统

### 6.1 短期记忆 (Redis)
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 对话上下文存储 | ✅ | ✔️ | |
| 工具调用中间结果缓存 | ✅ | ✔️ | |
| Session 管理 | ✅ | ✔️ | |
| 任务执行状态跟踪 | ⬜ | ⬜ | |

### 6.2 长期记忆 (Milvus)
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 记忆压缩策略设计 | ✅ | 🧪 | service/memory_service.py |
| 自动记忆总结 | ✅ | 🧪 | LLM 总结 + 关键洞察提取 |
| 记忆向量化存储 | ✅ | 🧪 | Milvus long_term_memories 集合 |
| 记忆检索和召回 | ✅ | 🧪 | 集成到 chat_service |
| 用户偏好学习 | ✅ | 🧪 | 自动提取用户兴趣和偏好 |
| 记忆管理 API | ✅ | 🧪 | router/memory_router.py |

### 6.3 前端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 记忆可视化界面 | ⬜ | ⬜ | |
| 记忆管理功能 | ⬜ | ⬜ | |

---

## 七、Text2SQL 工具

### 7.1 后端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| Text2SQL 服务 | ✅ | 🧪 | service/text2sql_service.py |
| 数据库 Schema 管理 | ✅ | 🧪 | |
| SQL 执行引擎 | ✅ | 🧪 | PostgreSQL |
| 结果格式化 | ✅ | 🧪 | |
| 作为 Agent 工具封装 | ✅ | 🧪 | tool_executor.py |

### 7.2 前端
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| SQL 查询结果展示 | ✅ | 🧪 | DataTable 组件 |
| 数据表格组件 | ✅ | 🧪 | |

---

## 八、行业 API 集成

### 8.1 股票资讯
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 聚合数据股票 API 对接 | ✅ | ✔️ | service/stock_service.py |
| 股票行情查询工具 | ✅ | 🧪 | StockService.get_stock_by_code |
| 作为 Agent 工具封装 | ✅ | 🧪 | ToolType.STOCK_QUERY |

### 8.2 招投标信息
| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 招投标 API 对接 | ✅ | ✔️ | service/bidding_service.py (81API) |
| 招投标查询工具 | ✅ | ✔️ | 中标/招标查询、标书详情 |
| 作为 Agent 工具封装 | ✅ | 🧪 | ToolType.BIDDING_SEARCH |

---

## 九、其他工具

| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| 代码解释器 (Code Interpreter) | ✅ | 🧪 | CodeWizard 自我修正 |
| 计算器工具 | ⬜ | ⬜ | |
| 时间工具 | ⬜ | ⬜ | |
| 翻译工具 | ⬜ | ⬜ | |

---

## 十、测试与文档

| 任务 | 开发状态 | 测试状态 | 备注 |
|------|---------|---------|------|
| API 接口测试 | 🔨 | ⬜ | scripts/test_*.py |
| 前端功能测试 | ⬜ | ⬜ | |
| Docker 部署测试 | ✅ | ✔️ | |
| 用户手册 | ⬜ | ⬜ | |
| API 文档 | ✅ | ✔️ | Swagger /docs |

---

## 开发日志

### 2025-12-24
- ✅ 重构服务架构
  - 创建 service/embedding_service.py - 统一向量化服务
  - 创建 service/retrieval_service.py - 统一检索服务
  - 删除冗余目录 service/core/ (旧的 deepdoc/rag 代码)
  - 删除空目录 service/deep_research/ (占位目录)
- ✅ 修复 DeepResearch V2 配置问题
  - 修复 ServiceConfig 缺少 bochaai_api_key/dashscope_api_key
  - 修复 Bocha API URL (api.bocha.cn -> api.bochaai.com)
  - 统一环境变量名 (BOCHA_API_KEY -> BOCHAAI_API_KEY)
- ✅ 实现聊天附件上传功能
  - 创建 ChatAttachment 数据模型 (models/chat.py)
  - 创建 attachment_router.py - 附件上传/删除/查询API
  - 创建 /chat/completion/v3 接口 - 支持带附件的问答
  - 前端 components/sender 组件添加附件上传功能
  - 前端 api/session.ts 添加附件相关API
  - 支持 PDF/Word/文本/图片/代码等多种文件类型
- ✅ 实现长期记忆系统
  - 创建 service/memory_service.py - 记忆压缩/总结/存储/检索
  - 创建 router/memory_router.py - 记忆管理API
  - 实现 LLM 驱动的对话总结和关键洞察提取
  - 实现记忆向量化存储到 Milvus (long_term_memories 集合)
  - 集成记忆召回到 chat_service 对话生成
  - 支持用户偏好学习（兴趣/沟通风格/关注领域）
- ✅ 实现行业 API 集成
  - 创建 service/stock_service.py - 聚合数据股票API服务
    - 支持股票代码查询 (sh/sz 前缀自动识别)
    - 获取实时行情: 价格、涨跌幅、成交量等
    - API连通性测试通过 ✔️
  - 创建 service/bidding_service.py - 81API招投标服务
    - 端点: https://bid.81api.com
    - 中标查询: /queryWinBid/[关键词]/[页码]
    - 招标查询: /queryBid/[关键词]/[页码]
    - 标书详情: /queryBidDetail/[ID]
    - 数据量: 5157万+ 招投标信息 ✔️
  - 集成到 Agent 工具系统
    - 新增 ToolType.STOCK_QUERY 股票查询工具
    - 新增 ToolType.BIDDING_SEARCH 招投标搜索工具
    - 更新 tool_executor.py 添加工具处理器
    - 更新 react_controller.py 添加工具定义

### 2025-12-23 (续)
- ✅ 实现对话历史持久化后端 API
  - 创建 session_router.py 会话管理路由
  - 更新 schemas/chat.py 添加 Session/Message 相关 Schema
  - 支持会话 CRUD 和消息管理
  - 自动根据首条消息生成会话标题
- ✅ 实现对话历史前端组件
  - 创建 api/session.ts 会话 API
  - 创建 store/session.ts 会话状态管理
  - 创建 SessionDrawer 组件（对话历史抽屉）
  - 支持对话列表展示、切换、删除、重命名

### 2024-12-23
- ✅ 创建 docker-compose.yml
- ✅ 创建数据库初始化脚本
- ✅ 创建启动脚本 start-services.sh
- ✅ 实现后端认证系统（JWT）
- ✅ 实现前端登录注册页面
- ✅ 创建数据库模型（User、ChatSession、ChatMessage、KnowledgeBase、Document、LongTermMemory）
- ✅ 创建 Text2SQL 示例数据

### 待处理问题
1. ✅ 知识库管理前端界面 (已完成)
2. ✅ 聊天附件上传功能 (已完成)
3. ✅ 长期记忆系统实现 (已完成)
4. ✅ 行业 API 集成 (已完成 - 股票API + 招投标API均可用)
5. ⬜ 记忆管理前端界面

---

## 技术栈

### 后端
- FastAPI + SQLAlchemy + PostgreSQL
- Milvus 向量数据库
- Redis 缓存
- 阿里云 DashScope (LLM + Embedding + Rerank)
- Bocha Web Search API
- LangGraph (多智能体编排)

### 前端
- React + TypeScript + Vite
- Ant Design + Tailwind CSS
- ECharts 图表
- Valtio 状态管理

---

## 快速启动命令

```bash
# 1. 启动中间件
./start-services.sh start

# 2. 启动后端
cd backend
conda activate deepresearch
pip install -r requirements.txt
python app/app_main.py

# 3. 启动前端
cd frontend
npm install
npm run dev

# 4. 访问
# 前端: http://localhost:5185
# 登录: http://localhost:5185/login
# API文档: http://localhost:8000/docs
```

---

*最后更新: 2025-12-24*
