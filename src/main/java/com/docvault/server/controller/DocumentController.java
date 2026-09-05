package com.docvault.server.controller;

import com.docvault.server.dto.DocumentDto;
import com.docvault.server.dto.DocumentSearchResponse;
import com.docvault.server.model.Document;
import com.docvault.server.model.User;
import com.docvault.server.repository.DocumentRepository;
import com.docvault.server.repository.UserRepository;
import com.docvault.server.service.DocumentProcessingService;
import com.docvault.server.service.SearchService;
import com.docvault.server.service.StorageService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final UserRepository userRepository;
    private final DocumentProcessingService documentProcessingService;
    private final SearchService searchService;

    public DocumentController(DocumentRepository documentRepository,
                              StorageService storageService,
                              UserRepository userRepository,
                              DocumentProcessingService documentProcessingService,
                              SearchService searchService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.userRepository = userRepository;
        this.documentProcessingService = documentProcessingService;
        this.searchService = searchService;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByUsername(username).orElseThrow();
    }

    @GetMapping("/check-checksum")
    public ResponseEntity<?> checkChecksum(@RequestParam("checksum") String checksum) {
        User user = getCurrentUser();
        Optional<Document> existing = documentRepository.findByUserIdAndChecksum(user.getId(), checksum);
        if (existing.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "exists", true,
                    "document", DocumentDto.from(existing.get())
            ));
        }
        return ResponseEntity.ok(Map.of("exists", false));
    }

    @PostMapping
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "title", required = false) String title,
                                            @RequestParam(value = "sourcePath", required = false) String sourcePath,
                                            @RequestParam(value = "checksum", required = false) String checksum) {
        User user = getCurrentUser();

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String docTitle = (title != null && !title.isBlank()) ? title : originalFilename;
            String contentType = file.getContentType();
            long size = file.getSize();

            String objectName = storageService.storeFile(user.getId(), originalFilename, file.getInputStream(), contentType);

            Document document = new Document();
            document.setUser(user);
            document.setTitle(docTitle);
            document.setOriginalFilename(originalFilename);
            document.setMimeType(contentType != null ? contentType : "application/octet-stream");
            document.setSizeBytes(size);
            document.setStoragePath(objectName);
            document.setStatus("PENDING");
            if (checksum != null && !checksum.isBlank()) {
                document.setChecksum(checksum);
            }
            if (sourcePath != null && !sourcePath.isBlank()) {
                document.setSourcePath(sourcePath);
            }

            Document savedDoc = documentRepository.save(document);

            // Trigger background text extraction and Elasticsearch indexing
            documentProcessingService.processDocumentAsync(savedDoc.getId());

            return ResponseEntity.status(HttpStatus.ACCEPTED).body(DocumentDto.from(savedDoc));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not upload file: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<DocumentDto>> listDocuments(
            @RequestParam(value = "categoryId", required = false) UUID categoryId) {
        User user = getCurrentUser();
        List<Document> docs;
        if (categoryId != null) {
            docs = documentRepository.findByUserIdAndCategoryIdOrderByCreatedAtDesc(user.getId(), categoryId);
        } else {
            docs = documentRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        }
        List<DocumentDto> dtos = docs.stream().map(DocumentDto::from).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDto> getDocument(@PathVariable UUID id) {
        User user = getCurrentUser();
        return documentRepository.findByIdAndUserId(id, user.getId())
                .map(doc -> ResponseEntity.ok(DocumentDto.from(doc)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<DocumentSearchResponse> searchDocuments(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "categoryId", required = false) UUID categoryId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        User user = getCurrentUser();
        DocumentSearchResponse results = searchService.searchDocuments(user.getId(), query, categoryId, page, size);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadDocument(@PathVariable UUID id) {
        User user = getCurrentUser();
        Document document = documentRepository.findByIdAndUserId(id, user.getId()).orElse(null);

        if (document == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            InputStream is = storageService.getFile(document.getStoragePath());
            InputStreamResource resource = new InputStreamResource(is);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getOriginalFilename() + "\"")
                    .contentType(MediaType.parseMediaType(document.getMimeType()))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error downloading file: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable UUID id) {
        User user = getCurrentUser();
        Document document = documentRepository.findByIdAndUserId(id, user.getId()).orElse(null);

        if (document == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            // Delete from MinIO
            storageService.deleteFile(document.getStoragePath());
            // Delete from Elasticsearch
            searchService.deleteDocument(document.getId().toString());
            // Delete from PostgreSQL
            documentRepository.delete(document);

            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting file: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/reindex")
    public ResponseEntity<?> reindexDocument(@PathVariable UUID id) {
        User user = getCurrentUser();
        Document document = documentRepository.findByIdAndUserId(id, user.getId()).orElse(null);

        if (document == null) {
            return ResponseEntity.notFound().build();
        }

        documentProcessingService.processDocumentAsync(document.getId());
        return ResponseEntity.accepted().body("Reindexing triggered for document " + id);
    }
}
