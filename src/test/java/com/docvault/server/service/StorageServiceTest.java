package com.docvault.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class StorageServiceTest {

    private StorageService storageService;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        storageService = new StorageService(tempDir.toString());
        storageService.init();
    }

    @Test
    void shouldStoreAndRetrieveFile() throws Exception {
        UUID userId = UUID.randomUUID();
        String originalFilename = "test_document.txt";
        byte[] content = "Hello, lightweight storage!".getBytes(StandardCharsets.UTF_8);

        String storagePath = storageService.storeFile(
                userId,
                originalFilename,
                new ByteArrayInputStream(content),
                "text/plain"
        );

        assertNotNull(storagePath);
        assertTrue(storagePath.startsWith(userId.toString() + "/"));
        assertTrue(storagePath.contains("test_document.txt"));

        // Retrieve file
        try (InputStream is = storageService.getFile(storagePath)) {
            byte[] retrievedBytes = is.readAllBytes();
            assertArrayEquals(content, retrievedBytes);
        }
    }

    @Test
    void shouldDeleteFile() throws Exception {
        UUID userId = UUID.randomUUID();
        byte[] content = "Content to delete".getBytes(StandardCharsets.UTF_8);

        String storagePath = storageService.storeFile(
                userId,
                "to_delete.txt",
                new ByteArrayInputStream(content),
                "text/plain"
        );

        // File should exist
        Path fullPath = storageService.getStorageDirectory().resolve(storagePath);
        assertTrue(Files.exists(fullPath));

        // Delete
        storageService.deleteFile(storagePath);
        assertFalse(Files.exists(fullPath));

        // Attempting to get deleted file should throw exception
        assertThrows(RuntimeException.class, () -> storageService.getFile(storagePath));
    }

    @Test
    void shouldPreventPathTraversalAttack() {
        UUID userId = UUID.randomUUID();
        String maliciousFilename = "../../etc/passwd";
        byte[] content = "malicious content".getBytes(StandardCharsets.UTF_8);

        // Storing with path traversal in filename should sanitize or stay inside storage dir
        String storagePath = storageService.storeFile(
                userId,
                maliciousFilename,
                new ByteArrayInputStream(content),
                "text/plain"
        );

        // The resolved path must still be inside storage directory
        Path targetPath = storageService.getStorageDirectory().resolve(storagePath).normalize();
        assertTrue(targetPath.startsWith(storageService.getStorageDirectory()));

        // Accessing path traversal via getFile should fail with SecurityException
        assertThrows(SecurityException.class, () -> storageService.getFile("../../../etc/passwd"));
        assertThrows(SecurityException.class, () -> storageService.deleteFile("../../../etc/passwd"));
    }

    @Test
    void shouldThrowWhenFileNotFound() {
        assertThrows(RuntimeException.class, () -> storageService.getFile("nonexistent-file.txt"));
    }
}
