# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
./mvnw spring-boot:run        # Start on port 8081 (JDK 17 required)
./mvnw clean install           # Full build
./mvnw test                    # Run tests
```

Requires running instances of MySQL 8.0+ and Elasticsearch 8.x (with IK analyzer plugin). Database schema is managed by Flyway and auto-migrates on startup.

## Architecture

Layered Spring Boot 3.3.4 application — Controller → Service → Repository → MySQL/Elasticsearch. Frontend is server-side rendered with Thymeleaf templates + vanilla JS + ECharts (no frontend framework).

**Dual ORM**: Spring Data JPA handles most CRUD via `repository/` interfaces. MyBatis-Plus (`mapper/CaseMapper.java`) is used only by `DataSyncService` for the bulk `selectList` → ES sync operation. JPA repos scan `org.example.qinglang.repository`, MyBatis mappers scan `org.example.qinglang.mapper`.

**AI integration**: WebSocket-based, no HTTP AI calls. `ChatWebSocketEndpoint` (`/ws/chat`) is the server endpoint — browsers connect directly. `SparkLiteService` acts as a WebSocket *client* to iFlytek Spark Lite API (`wss://spark-api.xf-yun.com/v1.1/chat`), bridging user messages and streaming responses. Auth uses HMacSHA256 via Hutool. `CaseQueryService` enriches the system prompt by matching user queries against case numbers/names/parties in MySQL. `CaseExtractionService` sends text with a strict JSON Schema prompt to extract structured case data and persists it across four tables (cases, parties, case_details, legal_supervision).

**Session auth**: `AuthController` stores `userId` in `HttpSession`. `WorkbenchController` and `ChatController` check `session.getAttribute("userId")` for authorization. Passwords are stored in plaintext (no hashing).

**Province mapping**: Both `CaseRepository` native queries and the `province_stats` SQL view use the same large `CASE WHEN` expression to map `court_name` strings to Chinese provinces. Changes to province mapping logic must be kept in sync across both locations. The view is defined in `V7__Update_Province_Stats_View.sql`.

**Data pipeline**: Excel → MySQL (`data_sync.py`, Pandas) → Elasticsearch (`import_data.py`, Python ES client). There is also a Java equivalent in `DataSyncService.java` triggered via `GET /admin/sync/all`.

## Key Conventions

- Controllers in `controller/` use `@RestController` for API endpoints (prefix `/api/`) and `@Controller` for page routing.
- API controllers return raw objects/strings (no `ResponseEntity` wrapper), relying on Spring's default JSON serialization.
- `CaseSaveRequest.java` is a composite DTO that bundles four entities (case + parties + detail + supervision) for the single "save full case" transaction in `WorkbenchController`.
- Thymeleaf templates live in `templates/` with matching JS in `static/js/` and CSS in `static/css/`. Each page (main, search, detail, workbench, analysis, index) has its own JS and CSS file.
- Flyway migration `V1__Create_Case_Management_Tables.sql` contains `DROP DATABASE IF EXISTS QingLang; CREATE DATABASE QingLang;` — this is destructive and will wipe data if run against an existing database.
