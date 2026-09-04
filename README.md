# DocVault

Document management and full-text search platform built with Spring Boot, PostgreSQL, MinIO, Apache Tika, Elasticsearch, and React.

## Architecture

- Backend: Java 21, Spring Boot 4.x, Spring Security (JWT)
- Frontend: React 19, Tailwind CSS, Lucide Icons, Vite
- Storage: PostgreSQL 16 (metadata), MinIO S3 (binary files)
- Text Extraction: Apache Tika (PDF, DOCX, XLSX, PPTX, TXT, HTML)
- Search Engine: Elasticsearch 8.13 (multi-tenant isolated querying with highlighting)
- Async Processing: Spring TaskExecutor

## Setup & Running

### 1. Start Services
```bash
docker compose up -d
```

Services:
- PostgreSQL: `localhost:5432` (`docvault` / `docvaultpassword`)
- MinIO: `localhost:9000` (Console: `localhost:9001`)
- Elasticsearch: `localhost:9200`

### 2. Backend
```bash
./gradlew bootRun
```
Listens on port 8080.

### 3. Frontend

Development mode:
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:3000` with API proxy to port 8080.

Production mode:
Built assets are located in `src/main/resources/static` and served directly by Spring Boot at `http://localhost:8080/`.

To rebuild assets:
```bash
cd frontend
npm run build
cp -r dist/* ../src/main/resources/static/
```

### 4. Tests
```bash
./gradlew test
```

## API Endpoints

All `/api/documents/**` endpoints require `Authorization: Bearer <token>`.

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register user (`username`, `email`, `password`)
- `POST /api/auth/login`: Authenticate and obtain JWT

### Documents (`/api/documents`)
- `POST /api/documents`: Upload file (`multipart/form-data`, optional `title`)
- `GET /api/documents`: List current user's documents
- `GET /api/documents/{id}`: Retrieve document metadata and processing status
- `GET /api/documents/{id}/download`: Download original file
- `GET /api/documents/search?q={query}`: Full-text search with highlights
- `POST /api/documents/{id}/reindex`: Trigger document re-indexing
- `DELETE /api/documents/{id}`: Delete from database, storage, and search index

## Ingestion Pipeline

1. File uploaded and saved to MinIO (`status: PENDING`).
2. Background task computes SHA-256 checksum and extracts text via Apache Tika (`status: PROCESSING`).
3. Extracted text and metadata are indexed in Elasticsearch.
4. Record updated in PostgreSQL (`status: INDEXED` or `status: FAILED` with error details).
