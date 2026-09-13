package com.docvault.server.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class StorageService {

    private final Path storageDirectory;

    public StorageService(@Value("${docvault.storage.location:./data/storage}") String storageLocation) {
        this.storageDirectory = Paths.get(storageLocation).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Error initializing storage directory: " + storageDirectory, e);
        }
    }

    public String storeFile(UUID userId, String originalFilename, InputStream stream, String contentType) {
        String sanitizedFilename = (originalFilename != null && !originalFilename.isBlank())
                ? Paths.get(originalFilename).getFileName().toString()
                : "file";
        String objectName = userId.toString() + "/" + UUID.randomUUID() + "-" + sanitizedFilename;
        Path targetPath = resolveAndVerify(objectName);

        try {
            Files.createDirectories(targetPath.getParent());
            Files.copy(stream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            return objectName;
        } catch (IOException e) {
            throw new RuntimeException("Error storing file: " + objectName, e);
        }
    }

    public InputStream getFile(String objectName) {
        Path filePath = resolveAndVerify(objectName);
        if (!Files.exists(filePath)) {
            throw new RuntimeException("File not found: " + objectName);
        }
        try {
            return Files.newInputStream(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Error retrieving file: " + objectName, e);
        }
    }

    public void deleteFile(String objectName) {
        Path filePath = resolveAndVerify(objectName);
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Error deleting file: " + objectName, e);
        }
    }

    public Path getStorageDirectory() {
        return storageDirectory;
    }

    private Path resolveAndVerify(String objectName) {
        Path resolved = storageDirectory.resolve(objectName).normalize();
        if (!resolved.startsWith(storageDirectory)) {
            throw new SecurityException("Invalid storage path: traversal outside storage directory");
        }
        return resolved;
    }
}
