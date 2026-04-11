
# 青朗法治 · 涉外案件全生命周期监督平台

<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-3.3.4-brightgreen" alt="Spring Boot">
  <img src="https://img.shields.io/badge/Elasticsearch-8.x-blue" alt="Elasticsearch">
  <img src="https://img.shields.io/badge/MySQL-8.0-orange" alt="MySQL">
  <img src="https://img.shields.io/badge/ECharts-5.4.0-aa2e2e" alt="ECharts">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

> 一个面向检察机关的涉外法治案件数据中台，集**3D地图可视化、智能检索、法律监督线索挖掘**于一体的综合业务指挥系统。

## 📖 项目简介

**青朗法治** 源于对大量真实涉外案件（民事、刑事、行政、公益诉讼）卷宗数据的数字化治理需求。系统以 Spring Boot 为后端核心，结合 Elasticsearch 实现毫秒级全文检索，并利用 ECharts GL 构建 3D 中国地图，直观展示各省涉外案件数量、风险等级及监督线索分布。

本项目的核心价值在于：

- **打破数据孤岛**：将分散的 Excel 卷宗台账整合为结构化的 MySQL 数据库。
- **监督线索主动发现**：内置法律监督点分析，自动标记“法律适用错误”“程序违法”等高风险案件。
- **涉外特色支持**：管理当事人国籍、境外证据、适用国际条约（如CISG、纽约公约）等信息。
- **可视化指挥**：提供“全国-省份”两级下钻的案件态势感知能力。

## ✨ 主要功能

| 模块 | 功能描述 |
| :--- | :--- |
| **统一认证** | 用户注册/登录，基于 Session 的权限控制。 |
| **3D 指挥中心** | 全国案件分布 3D 地图，支持省份锁定、悬浮查看详情、小区域快捷导航。 |
| **多维案件筛选** | 左侧面板展示核心指标（总案件数、卷宗页数）、适用法律占比、国籍 Top5；底部按“刑事/民事/行政/公益诉讼”四列展示案件列表。 |
| **案由筛选器** | 横向滚动的案由按钮，点击后底部案件列表实时过滤。 |
| **全文搜索引擎** | 基于 Elasticsearch + IK 分词器，支持案件编号、当事人、法院名称的模糊搜索。 |
| **搜索分析页** | 展示搜索结果统计、年度趋势折线图、地区结案贡献率柱状图。 |
| **案件详情页** | 展示案件基本信息、当事人信息、数字化卷宗情况以及**法律监督评价**。 |
| **数据同步** | 提供 Python 脚本，支持从 Excel 一键清洗并导入 MySQL，再同步至 Elasticsearch。 |

## 🛠️ 技术栈

### 后端
- **核心框架**: Spring Boot 3.3.4
- **数据库**: MySQL 8.0
- **数据库迁移**: Flyway
- **ORM**: Spring Data JPA + MyBatis-Plus
- **搜索引擎**: Elasticsearch 8.x
- **工具库**: Lombok, Spring Validation

### 前端
- **模板引擎**: Thymeleaf
- **可视化库**: ECharts 5.4.0 + ECharts GL (3D地图) + ECharts WordCloud (词云)
- **样式**: 原生 CSS (深色科技风)

### 数据处理
- **语言**: Python 3
- **依赖**: Pandas, PyMySQL, SQLAlchemy, Elasticsearch-py

## 📁 项目结构

```
QingLang/
├── src/main/java/org/example/qinglang/
│   ├── controller/          # 接口控制器 (Auth, Case, Map, Dashboard...)
│   ├── entity/              # JPA 实体类 (Case, Party, Detail, Supervision...)
│   ├── repository/          # Spring Data JPA 仓库接口
│   ├── service/             # 业务逻辑层
│   └── mapper/              # MyBatis-Plus Mapper
├── src/main/resources/
│   ├── static/css/          # 样式文件 (main.css, search.css, detail.css...)
│   ├── static/js/           # 脚本文件 (main.js, search.js, detail.js...)
│   ├── templates/           # Thymeleaf 页面 (index.html, main.html, search.html, detail.html)
│   ├── application.properties # 全局配置
│   └── db/migration/        # Flyway SQL 迁移脚本 (V1__..., V2__..., V3__...)
├── data/                    # Excel 原始数据与 Python 导入脚本
│   ├── qinglang_data.xlsx   # 案件台账源文件（四张 Sheet）
│   ├── data_sync.py         # 使用 Pandas 清洗并写入 MySQL
│   └── import_data.py       # 从 MySQL 联表查询并同步至 Elasticsearch
└── pom.xml                  # Maven 依赖配置
```

### 📋 Sheet 1: `cases` (案件基础信息)

对应数据库表 `cases`。

| 字段名 | 数据类型 | 说明 |
| :--- | :--- | :--- |
| `case_number` | 文本 | 案件编号（唯一标识），如 `(2013)民申字第1189号` |
| `case_name` | 文本 | 案件名称 |
| `court_name` | 文本 | 审理法院 / 检察院名称 |
| `case_type` | 文本 | 案件类型：`民事` / `刑事` / `行政` / `公益诉讼` |
| `acceptance_date` | 日期 | 受理日期 |
| `closing_date` | 日期 | 结案日期 |
| `total_pages` | 整数 | 卷宗总页数 |
| `document_types` | 文本 | 文书类型（多个用顿号分隔） |

### 👥 Sheet 2: `parties` (当事人信息)

对应数据库表 `parties`，通过 `case_number` 关联案件。

| 字段名 | 数据类型 | 说明 |
| :--- | :--- | :--- |
| `case_number` | 文本 | 关联的案件编号 |
| `party_name` | 文本 | 当事人姓名 / 名称（多个用顿号分隔） |
| `nationality` | 文本 | 国籍 |
| `party_type` | 文本 | 当事人类型：`法人` / `自然人` |
| `has_foreign_lawyer` | 布尔 | 是否聘请外籍律师 |
| `language_ability` | 文本 | 外籍当事人语言能力 |
| `is_foreign_invested` | 布尔 | 是否涉及外商投资企业 |

### 📑 Sheet 3: `details` (案件业务详情与裁判结果)

对应数据库表 `case_details`，通过 `case_number` 关联案件。

| 字段名 | 数据类型 | 说明 |
| :--- | :--- | :--- |
| `case_number` | 文本 | 关联的案件编号 |
| `case_reason` | 文本 | 涉外案由 |
| `has_overseas_evidence` | 布尔 | 是否涉及境外证据 |
| `overseas_evidence_type` | 文本 | 境外证据类型 |
| `infringement_location` | 文本 | 侵权行为发生地 |
| `damage_location` | 文本 | 损害结果发生地 |
| `applicable_law` | 文本 | 适用法律 / 条约 |
| `treaty_priority` | 布尔 | 是否主张条约优先适用 |
| `foreign_related_pages` | 整数 | 涉外相关页数 |
| `archive_language` | 文本 | 卷宗语种 |
| `judgment_result` | 文本 | 裁判结果 / 判决主文 |

### ⚖️ Sheet 4: `supervision` (法律监督信息)

对应数据库表 `legal_supervision`，通过 `case_number` 关联案件。

| 字段名 | 数据类型 | 说明 |
| :--- | :--- | :--- |
| `case_number` | 文本 | 关联的案件编号 |
| `has_supervision_point` | 布尔 | 是否存在监督点 |
| `supervision_field` | 文本 | 监督领域 |
| `supervision_type` | 文本 | 监督类型 |
| `clue_description` | 文本 | 监督线索具体描述 |
| `severity_level` | 文本 | 监督线索严重程度：`高` / `中` / `低` |

> **注意**：Excel 中的日期格式、换行符（`<br>`）、空值（`/`、`无`）等在 `data_sync.py` 中均已被妥善清洗。

## 🐳 Docker 环境配置 (Elasticsearch)

为了简化开发环境的搭建，强烈建议使用 Docker 运行 Elasticsearch 和 Kibana（可选）。本项目基于 **Elasticsearch 8.x** 开发，请确保拉取对应版本的镜像。

### 1. 拉取镜像并创建网络
```bash
# 创建 Docker 网络，方便容器间通信
docker network create elastic

# 拉取 Elasticsearch 8.x 镜像 (以 8.11.0 为例)
docker pull elasticsearch:8.11.0

# (可选) 拉取 Kibana 镜像，用于可视化调试
docker pull kibana:8.11.0
```

### 2. 启动 Elasticsearch 容器
```bash
docker run -d \
  --name es01 \
  --net elastic \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms1g -Xmx1g" \
  elasticsearch:8.11.0
```

> **注意**：
> - 为了方便本地开发，此处**关闭了 X-Pack Security** 安全认证（`xpack.security.enabled=false`）。**生产环境请务必开启认证并设置密码**。
> - 端口 `9200` 用于 HTTP API 访问，`9300` 用于集群内部通信。
> - 内存限制 `-Xms1g -Xmx1g` 可根据你的机器配置调整。

### 3. 安装 IK 分词器插件
本项目的中文搜索依赖 IK 分词器，需要进入容器内部安装：

```bash
# 进入容器
docker exec -it es01 bash

# 在线安装 IK 分词器 (版本需与 ES 版本一致)
./bin/elasticsearch-plugin install https://get.infini.cloud/elasticsearch/analysis-ik/8.11.0

# 退出容器
exit

# 重启容器使插件生效
docker restart es01
```

等待 Elasticsearch 重启完成后，访问 `http://localhost:9200`，若看到如下 JSON 响应则表示启动成功：
```json
{
  "name" : "...",
  "cluster_name" : "docker-cluster",
  "version" : { "number" : "8.11.0" ... }
}
```

### 4. (可选) 启动 Kibana 可视化界面
```bash
docker run -d \
  --name kibana \
  --net elastic \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://es01:9200" \
  kibana:8.11.0
```
启动后访问 `http://localhost:5601`，即可使用 Kibana Dev Tools 调试搜索语句。

## 🚀 快速开始

### 环境准备
- **JDK**: 17 或更高版本
- **MySQL**: 8.0+
- **Elasticsearch**: 8.x (需安装 IK 分词器插件，推荐使用上述 Docker 方式部署)
- **Maven**: 3.6+
- **Python**: 3.8+ (仅用于数据导入)

### 1. 克隆仓库
```bash
git clone https://github.com/yourusername/QingLang.git
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
```

### 3. 初始化数据库
Flyway 会在应用启动时自动执行 `src/main/resources/db/migration` 下的 SQL 脚本，创建表结构和视图。无需手动运行 SQL。

### 4. 导入 Excel 数据
进入项目根目录，执行 Python 脚本（请先安装依赖）：
```bash
pip install pandas pymysql sqlalchemy elasticsearch
cd data
python data_sync.py      # 将 Excel 数据清洗并写入 MySQL
python import_data.py    # 将 MySQL 数据联表聚合并同步到 Elasticsearch
```

### 5. 启动后端服务
```bash
# 返回项目根目录
mvn spring-boot:run
```

### 6. 访问系统
- 打开浏览器，访问 `http://localhost:8080/`
- 注册新账号或使用测试账号登录。
- 进入 `/main` 查看 3D 指挥中心。

## 📊 数据模型概览

系统围绕 **案件 (cases)** 主表构建了以下关联表：

- **parties**：当事人信息（支持多国籍、外籍律师标记）。
- **case_details**：案由、境外证据、适用法律、条约优先适用等涉外专属字段。
- **legal_supervision**：检察机关监督线索，包含监督点描述和严重等级。
- **province_stats (视图)**：基于法院名称自动映射省份，用于地图数据聚合。

## 🤝 贡献指南

我们欢迎任何形式的贡献！如果你希望改进代码或修复 Bug，请遵循以下流程：

1. **Fork** 本仓库。
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 开启一个 **Pull Request**。

对于较大的改动，建议先提交 Issue 讨论你的想法。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 进行许可。你可以自由地使用、修改和分发本项目的代码，但需保留原始版权声明。

## 📧 联系方式

- **项目维护者**: Silence
- **邮箱**: silencebase313@gmail.com
- **GitHub Issues**: [https://github.com/Silence-313/QingLang/issues](https://github.com/Silence-313/QingLang/issues)

---

<p align="center">Made with ❤️ for Legal Tech & Open Justice</p>
```

### 使用说明

请将文档中的 `yourusername`、`Your Name`、`your.email@example.com` 替换为你实际的 GitHub 用户名和联系方式。另外建议在 `docs/images/` 目录下放置四张界面截图（`login.png`、`main.png`、`search.png`、`detail.png`），使文档更加生动专业。如果暂时没有截图，可以删除表格中的图片引用，或保留为文字占位符。