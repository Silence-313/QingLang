
# 青朗法治 · 涉外案件全生命周期监督平台

<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-3.3.4-brightgreen" alt="Spring Boot">
  <img src="https://img.shields.io/badge/Elasticsearch-8.x-blue" alt="Elasticsearch">
  <img src="https://img.shields.io/badge/MySQL-8.0-orange" alt="MySQL">
  <img src="https://img.shields.io/badge/ECharts-5.4.0-aa2e2e" alt="ECharts">
  <img src="https://img.shields.io/badge/MyBatis--Plus-3.5.7-2c3e50" alt="MyBatis-Plus">
  <img src="https://img.shields.io/badge/WebSocket-实时通信-6a1b9a" alt="WebSocket">
  <img src="https://img.shields.io/badge/AI-讯飞星火_Lite-ff69b4" alt="AI">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

> 一个面向检察机关的涉外法治案件数据中台，集**3D地图可视化、智能检索、法律监督线索挖掘、AI智能助手**于一体的综合业务指挥系统。

## 📖 项目简介

**青朗法治** 源于对大量真实涉外案件（民事、刑事、行政、公益诉讼）卷宗数据的数字化治理需求。系统以 Spring Boot 为后端核心，结合 Elasticsearch 实现毫秒级全文检索，并利用 ECharts GL 构建 3D 中国地图，直观展示各省涉外案件数量、风险等级及监督线索分布。

本项目的核心价值在于：

- **打破数据孤岛**：将分散的 Excel 卷宗台账整合为结构化的 MySQL 数据库。
- **监督线索主动发现**：内置法律监督点分析，自动标记“法律适用错误”“程序违法”等高风险案件。
- **涉外特色支持**：管理当事人国籍、境外证据、适用国际条约（如CISG、纽约公约）等信息。
- **可视化指挥**：提供“全国-省份”两级下钻的案件态势感知能力。
- **AI 赋能**：集成讯飞星火大模型，支持案件信息智能提取与实时法律问答。

## ✨ 主要功能

| 模块 | 功能描述 | 技术亮点 |
| :--- | :--- | :--- |
| **统一认证** | 用户注册/登录，基于 Session 的权限控制。 | Spring Boot + Session |
| **3D 指挥中心** | 全国案件分布 3D 地图，支持省份锁定、悬浮查看详情、小区域快捷导航。 | ECharts GL + china.js |
| **多维案件筛选** | 左侧面板展示核心指标（总案件数、卷宗页数）、适用法律占比、国籍 Top5；底部按“刑事/民事/行政/公益诉讼”四列展示案件列表。 | JPA 动态查询 |
| **案由筛选器** | 横向滚动的案由按钮，点击后底部案件列表实时过滤。 | RESTful API |
| **全文搜索引擎** | 基于 Elasticsearch + IK 分词器，支持案件编号、当事人、法院名称的模糊搜索。 | Spring Data Elasticsearch |
| **搜索分析页** | 展示搜索结果统计、年度趋势折线图、地区结案贡献率柱状图、词云分析。 | ECharts + WordCloud |
| **案件详情页** | 展示案件基本信息、当事人信息、数字化卷宗情况以及**法律监督评价**。 | JPA 多表关联 |
| **数据同步** | 提供 Python 脚本，支持从 Excel 一键清洗并导入 MySQL，再同步至 Elasticsearch。 | Pandas + PyMySQL |
| **AI 智能提取** | 上传 PDF/DOCX/TXT 文件或粘贴文本，AI 自动提取案件结构化信息并创建待办。 | 讯飞星火 Lite + PDFBox + POI |
| **实时法律问答** | 右侧智能助手支持 WebSocket 流式对话，结合案件上下文提供专业回答。 | WebSocket + 星火大模型 |
| **工作台** | 待办任务管理、案件信息编辑、多会话对话历史归档。 | 会话级对话管理 |

## 🛠️ 技术栈

### 后端
| 技术 | 版本 | 用途 |
| :--- | :--- | :--- |
| **Spring Boot** | 3.3.4 | 核心框架 |
| **Spring Data JPA** | - | ORM 数据访问 |
| **MyBatis-Plus** | 3.5.7 | 辅助查询与数据同步 |
| **Spring WebSocket** | - | 实时通信 |
| **Flyway** | - | 数据库版本管理与迁移 |
| **MySQL** | 8.0 | 关系型数据存储 |
| **Elasticsearch** | 8.x | 全文搜索引擎 |
| **IK 分词器** | - | 中文分词支持 |
| **Apache PDFBox** | 3.0.3 | PDF 文本提取 |
| **Apache POI** | 5.2.5 | Word 文档解析 |
| **Java-WebSocket** | 1.5.3 | 讯飞星火 WebSocket 客户端 |
| **Hutool** | 5.8.23 | 工具类库（加密、HTTP） |
| **Lombok** | - | 简化实体类代码 |
| **Spring Validation** | - | 参数校验 |

### 前端
| 技术 | 版本 | 用途 |
| :--- | :--- | :--- |
| **Thymeleaf** | - | 服务端模板渲染 |
| **ECharts** | 5.4.0 | 2D 图表绘制 |
| **ECharts GL** | 2.0.9 | 3D 地图渲染 |
| **ECharts WordCloud** | 2.1.0 | 词云可视化 |
| **原生 JavaScript** | ES6 | 交互逻辑与 AJAX 请求 |
| **Marked.js** | - | Markdown 渲染（AI 回答） |
| **CSS3** | - | 深色科技风样式 |

### 数据处理
| 技术 | 版本 | 用途 |
| :--- | :--- | :--- |
| **Python** | 3.8+ | 脚本语言 |
| **Pandas** | - | Excel 数据清洗与转换 |
| **PyMySQL** | - | MySQL 连接器 |
| **SQLAlchemy** | - | 数据库引擎抽象 |
| **Elasticsearch-py** | - | ES 批量导入客户端 |

## 📁 项目结构

```
QingLang/
├── src/main/java/org/example/qinglang/
│   ├── config/               # 配置类 (WebConfig, WebSocketConfig)
│   ├── controller/           # REST 控制器 (20+ 个)
│   ├── dto/                  # 数据传输对象
│   ├── entity/               # JPA 实体 & ES 文档模型
│   ├── mapper/               # MyBatis-Plus Mapper
│   ├── repository/           # Spring Data JPA Repository
│   ├── service/              # 业务逻辑层 (含 AI 提取、数据同步)
│   └── websocket/            # WebSocket 端点
├── src/main/resources/
│   ├── static/css/           # 样式文件 (main.css, search.css, detail.css, workbench.css)
│   ├── static/js/            # 脚本文件 (main.js, search.js, detail.js, workbench.js, analysis.js)
│   ├── templates/            # Thymeleaf 页面 (index.html, main.html, search.html, detail.html, workbench.html, analysis.html)
│   ├── application.properties # 全局配置 (DB, ES, 星火密钥)
│   └── db/migration/         # Flyway SQL 迁移脚本 (V1 ~ V7)
├── data/                     # Excel 原始数据与 Python 导入脚本
│   ├── qinglang历案data.xlsx  # 案件台账源文件（四张 Sheet）
│   ├── data_sync.py          # 使用 Pandas 清洗并写入 MySQL
│   └── import_data.py        # 从 MySQL 联表查询并同步至 Elasticsearch
├── pom.xml                   # Maven 依赖配置
└── README.md                 # 项目文档
```

## 🔧 核心业务架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                              前端展示层                              │
│  Thymeleaf + ECharts + 原生 JS → 3D 地图、图表、表单、WebSocket 对话  │
└─────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Spring Boot 后端层                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Controller  │→│   Service   │→│ Repository  │→│   Entity    │ │
│  │  (REST API) │  │ (业务逻辑)  │  │  (JPA/MP)   │  │  (JPA/ES)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │                │                                          │
│         ▼                ▼                                          │
│  ┌─────────────┐  ┌─────────────────────────────────────────────┐   │
│  │  WebSocket  │  │                AI 集成模块                   │   │
│  │   Endpoint  │  │  SparkLiteService (讯飞星火 WebSocket 客户端) │   │
│  └─────────────┘  │  CaseExtractionService (结构化信息提取)      │   │
│                    │  CaseQueryService (案件上下文检索)           │   │
│                    └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│                              数据存储层                              │
│  ┌─────────────────┐        ┌─────────────────────────────────────┐ │
│  │     MySQL 8.0   │        │         Elasticsearch 8.x           │ │
│  │  (关系型业务数据) │◄──────►│  (全文检索索引，IK 分词器)           │ │
│  └─────────────────┘        └─────────────────────────────────────┘ │
│         ▲                              ▲                             │
│         │                              │                             │
│  ┌──────┴──────┐              ┌───────┴───────┐                     │
│  │  data_sync  │              │  import_data  │                     │
│  │  (Excel清洗) │              │  (MySQL→ES)   │                     │
│  └─────────────┘              └───────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📊 数据模型详解

系统围绕 **案件 (`cases`)** 主表构建了以下关联表，所有表均通过 `case_id` 外键关联：

| 表名 | 说明 | 核心字段 |
| :--- | :--- | :--- |
| `cases` | 案件基础信息 | `case_number`, `case_name`, `court_name`, `case_type`, `acceptance_date` |
| `parties` | 当事人信息 | `party_name`, `nationality`, `has_foreign_lawyer`, `is_foreign_invested` |
| `case_details` | 案件业务详情 | `case_reason`, `judgment_results`, `has_overseas_evidence`, `applicable_law` |
| `legal_supervision` | 法律监督线索 | `has_supervision_point`, `supervision_field`, `clue_description`, `severity_level` |
| `pending_tasks` | 待办任务 | `task_status`, `priority`, `due_date` |
| `conversations` | 对话会话 | `title`, `user_id` |
| `chat_history` | 对话历史 | `role`, `content`, `conversation_id` |
| `login` | 用户表 | `username`, `email`, `phone`, `password` |

**关键视图**：
- **`province_stats`**：通过 `court_name` 字段中的关键词（如“北京”“上海知识产权法院”）动态映射到省份，并聚合案件数量、风险评分。该视图直接驱动 3D 地图的数据展示。

## 🤖 AI 能力详解

### 1. 案件信息智能提取
- **入口**：工作台点击“新建待办”，粘贴文本或上传 PDF/DOCX/TXT 文件。
- **流程**：
    1. `FileUploadController` 接收文件，使用 **Apache PDFBox** 或 **Apache POI** 提取纯文本。
    2. `CaseExtractionService` 将文本发送至 **讯飞星火 Lite** 模型，要求按预定 JSON Schema 输出。
    3. 模型返回结构化数据后，自动写入 `cases`, `parties`, `case_details`, `legal_supervision` 四张表。
    4. 同时创建一个待办任务（`pending_tasks`），提醒用户审核。

### 2. 智能法律助手
- **通信方式**：前端通过 **WebSocket** 连接后端 `/ws/chat` 端点。
- **上下文增强**：`CaseQueryService` 会解析用户问题中的关键词（如案号、当事人姓名），若匹配到数据库中的案件，则将案件摘要作为上下文一并发送给星火模型，使回答更具针对性。
- **流式响应**：模型逐字返回内容，前端使用 **Marked.js** 实时渲染 Markdown 格式的答案。

## 🗺️ 省份智能映射逻辑

系统通过 SQL `CASE WHEN` 语句实现法院名称到省份的精准映射，覆盖了：
- 最高人民法院 → 北京
- 专门法院（如北京知识产权法院、上海海事法院）→ 对应省份
- 省、自治区、直辖市名称直接匹配
- 地级市、自治州名称反向查找所属省份

该逻辑同时应用于 `province_stats` 视图和 `CaseRepository` 的动态查询，确保了地图数据与列表筛选的一致性。

## 🚀 快速开始

### 环境准备
- **JDK**: 17+
- **MySQL**: 8.0+
- **Elasticsearch**: 8.x (需安装 **IK 分词器**，推荐 Docker 部署)
- **Maven**: 3.6+
- **Python**: 3.8+ (仅用于数据导入)

### 1. 克隆仓库
```bash
git clone https://github.com/Silence-313/QingLang.git
cd QingLang
```

### 2. 配置数据库与 Elasticsearch
编辑 `src/main/resources/application.properties`：
```properties
# MySQL 配置
spring.datasource.url=jdbc:mysql://localhost:3306/qinglang?serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your_password

# Elasticsearch 配置
spring.elasticsearch.uris=http://localhost:9200

# 讯飞星火 API (请替换为自己的密钥)
spark.app-id=your_app_id
spark.api-key=your_api_key
spark.api-secret=your_api_secret
```

### 3. 启动 Elasticsearch (Docker 推荐)
```bash
docker network create elastic
docker run -d --name es01 --net elastic -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms1g -Xmx1g" elasticsearch:8.11.0

# 安装 IK 分词器
docker exec -it es01 bash
./bin/elasticsearch-plugin install https://get.infini.cloud/elasticsearch/analysis-ik/8.11.0
exit
docker restart es01
```

### 4. 初始化数据库与数据
Flyway 会在应用启动时自动创建表结构。随后执行 Python 脚本导入 Excel 数据：
```bash
pip install pandas pymysql sqlalchemy elasticsearch
cd data
python data_sync.py      # Excel → MySQL
python import_data.py    # MySQL → Elasticsearch
```

### 5. 启动后端服务
```bash
mvn spring-boot:run
```

### 6. 访问系统
- 打开浏览器，访问 `http://localhost:8080/`
- 注册账号后登录，进入 `/main` 体验 3D 指挥中心。

## 📄 Excel 数据模板说明

为了便于批量导入历史数据，项目根目录下的 `data/qinglang历案data.xlsx` 应包含以下四个 Sheet：

| Sheet 名称 | 对应数据库表 | 必填字段 |
| :--- | :--- | :--- |
| `cases` | `cases` | `case_number`, `case_name` |
| `parties` | `parties` | `case_number`, `party_name` |
| `details` | `case_details` | `case_number` |
| `supervision` | `legal_supervision` | `case_number` |

详细字段说明请参考上方“数据模型详解”部分。Python 脚本会自动清洗空值、日期格式和布尔值。

## 🤝 贡献指南

我们欢迎任何形式的贡献！如果你希望改进代码或修复 Bug，请遵循以下流程：

1. **Fork** 本仓库。
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 开启一个 **Pull Request**。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 进行许可。

## 📧 联系方式

- **项目维护者**: Silence
- **邮箱**: silencebase313@gmail.com
- **GitHub**: [https://github.com/Silence-313/QingLang](https://github.com/Silence-313/QingLang)

---

<p align="center">Made with ❤️ for Legal Tech & Open Justice</p>
