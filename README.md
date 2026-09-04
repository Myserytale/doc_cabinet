# DocVault (doc_cabinet)

DocVault is a secure, high-performance document management and full-text search platform built with Spring Boot, PostgreSQL, MinIO S3 object storage, Apache Tika, and Elasticsearch.

---

## 🏗 Architecture & Technologies

- **Backend**: Java 21, Spring Boot 4.x, Spring Security (Stateless JWT authentication)
- **Database**: PostgreSQL 16 with Flyway database migrations
- **Object Storage**: MinIO S3 for binary document storage
- **Text & Metadata Extraction**: Apache Tika (supports PDF, DOCX, TXT, HTML, RTF, PPTX, XLSX, etc.)
- **Full-Text Search Engine**: Elasticsearch 8.13 with highlighted query snippets and strict multi-tenant isolation
- **Asynchronous Task Queue**: Spring `@Async` ThreadPoolTaskExecutor for background document processing

---

## 🚀 Quick Start

### 1. Prerequisites
- Java 21+
- Docker and Docker Compose

### 2. Start Infrastructure
Start PostgreSQL, MinIO, and Elasticsearch:
```bash
docker compose up -d
```

Services exposed:
- **PostgreSQL**: `localhost:5432` (`docvault` / `docvaultpassword`)
- **MinIO S3 API**: `http://localhost:9000` (`docvaultadmin` / `docvaultadminpassword`)
- **MinIO Web Console**: `http://localhost:9001`
- **Elasticsearch API**: `http://localhost:9200`

### 3. Run the Application
```bash
./gradlew bootRun
```
The server will start on port `8080`.

### 4. Run Tests
```bash
./gradlew test
```

---

## 📡 API Reference

All requests to `/api/documents/**` require an `Authorization: Bearer <JWT_TOKEN>` header.

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new account (`username`, `email`, `password`) |
| `POST` | `/api/auth/login` | Authenticate and receive a JWT token |

### Documents (`/api/documents`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents` | Upload a document (`file` multipart, optional `title`). Triggers async processing. |
| `GET` | `/api/documents` | List all documents owned by the authenticated user |
| `GET` | `/api/documents/{id}` | Get document metadata, checksum, status (`PENDING`, `PROCESSING`, `INDEXED`, `FAILED`) |
| `GET` | `/api/documents/{id}/download` | Stream and download original file from MinIO |
| `GET` | `/api/documents/search?q={query}&page=0&size=10` | Full-text search across user's documents with `<mark>` highlight snippets |
| `POST` | `/api/documents/{id}/reindex` | Trigger background text extraction and reindexing |
| `DELETE` | `/api/documents/{id}` | Delete document from PostgreSQL, MinIO storage, and Elasticsearch index |

---

## 🔄 Document Ingestion Pipeline

1. **Upload**: Document is stored in MinIO under `<userId>/<uuid>-<filename>` and saved in PostgreSQL with status `PENDING`.
2. **Background Processing**:
   - Status transitions to `PROCESSING`.
   - Complete SHA-256 checksum is computed over the binary stream.
   - Text is extracted using Apache Tika's `AutoDetectParser`.
   - Document metadata and text content are indexed into Elasticsearch under the user's isolated partition.
   - Status updates to `INDEXED` (or `FAILED` with `error_message` on parse errors).
