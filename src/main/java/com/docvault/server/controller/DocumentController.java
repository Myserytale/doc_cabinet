package com.docvault.server.controller;

import com.docvault.server.model.Document;
import com.docvault.server.model.User;
import com.docvault.server.repository.DocumentRepository;
import com.docvault.server.repository.UserRepository;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final UserRepository userRepository;

    public DocumentController(DocumentRepository documentRepository, StorageService storageService, UserRepository userRepository) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByUsername(username).orElseThrow();
    }

    @PostMapping
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "title", required = false) String title) {
        User user = getCurrentUser();
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String docTitle = (title != null && !title.isEmpty()) ? title : originalFilename;
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

            Document savedDoc = documentRepository.save(document);
            return ResponseEntity.ok(savedDoc);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not upload file: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<Document>> listDocuments() {
        User user = getCurrentUser();
        List<Document> docs = documentRepository.findByUserId(user.getId());
        return ResponseEntity.ok(docs);
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
}
