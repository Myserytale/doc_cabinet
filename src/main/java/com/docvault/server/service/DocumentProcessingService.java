package com.docvault.server.service;

import com.docvault.server.dto.IndexedDocument;
import com.docvault.server.model.Document;
import com.docvault.server.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class DocumentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessingService.class);

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final TextExtractionService textExtractionService;
    private final SearchService searchService;

    public DocumentProcessingService(DocumentRepository documentRepository,
                                     StorageService storageService,
                                     TextExtractionService textExtractionService,
                                     SearchService searchService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.textExtractionService = textExtractionService;
        this.searchService = searchService;
    }

    @Async("documentTaskExecutor")
    public void processDocumentAsync(UUID documentId) {
        processDocument(documentId);
    }

    public void processDocument(UUID documentId) {
        Optional<Document> docOpt = documentRepository.findById(documentId);
        if (docOpt.isEmpty()) {
            log.warn("Document with id {} not found for processing", documentId);
            return;
        }

        Document document = docOpt.get();
        document.setStatus("PROCESSING");
        document.setUpdatedAt(OffsetDateTime.now());
        documentRepository.save(document);

        Path tempFile = null;
        try {
            tempFile = Files.createTempFile("docvault-extract-", ".tmp");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            try (InputStream minioStream = storageService.getFile(document.getStoragePath());
                 DigestInputStream dis = new DigestInputStream(minioStream, digest);
                 OutputStream out = Files.newOutputStream(tempFile)) {
                dis.transferTo(out);
            }

            String checksum = HexFormat.of().formatHex(digest.digest());

            // Extract text with Apache Tika
            String extractedText = textExtractionService.extractText(tempFile);

            // Index into Elasticsearch
            IndexedDocument indexedDoc = new IndexedDocument(
                    document.getId().toString(),
                    document.getUser().getId().toString(),
                    document.getTitle(),
                    document.getOriginalFilename(),
                    document.getMimeType(),
                    document.getSizeBytes(),
                    checksum,
                    extractedText,
                    document.getCreatedAt() != null ? document.getCreatedAt().toInstant() : Instant.now()
            );
            searchService.indexDocument(indexedDoc);

            // Update document status in PostgreSQL
            document.setChecksum(checksum);
            document.setStatus("INDEXED");
            document.setErrorMessage(null);
            document.setUpdatedAt(OffsetDateTime.now());
            documentRepository.save(document);

            log.info("Document {} successfully processed, checksum calculated ({}), and indexed in Elasticsearch", documentId, checksum);
        } catch (Exception e) {
            log.error("Failed to process document {}: {}", documentId, e.getMessage(), e);
            document.setStatus("FAILED");
            document.setErrorMessage(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            document.setUpdatedAt(OffsetDateTime.now());
            documentRepository.save(document);
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (Exception e) {
                    log.warn("Failed to delete temporary file {}: {}", tempFile, e.getMessage());
                }
            }
        }
    }
}
