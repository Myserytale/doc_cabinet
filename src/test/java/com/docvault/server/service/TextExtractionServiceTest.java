package com.docvault.server.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class TextExtractionServiceTest {

    private final TextExtractionService textExtractionService = new TextExtractionService();

    @Test
    void shouldExtractTextFromTextFile(@TempDir Path tempDir) throws Exception {
        Path textFile = tempDir.resolve("sample.txt");
        Files.writeString(textFile, "Hello DocVault! This is a confidential test document.");

        String extracted = textExtractionService.extractText(textFile);

        assertNotNull(extracted);
        assertTrue(extracted.contains("Hello DocVault"));
        assertTrue(extracted.contains("confidential test document"));
    }

    @Test
    void shouldExtractTextFromHtmlFile(@TempDir Path tempDir) throws Exception {
        Path htmlFile = tempDir.resolve("sample.html");
        Files.writeString(htmlFile, "<html><body><h1>DocVault Architecture</h1><p>Elasticsearch and MinIO integration.</p></body></html>");

        String extracted = textExtractionService.extractText(htmlFile);

        assertNotNull(extracted);
        assertTrue(extracted.contains("DocVault Architecture"));
        assertTrue(extracted.contains("Elasticsearch and MinIO integration"));
    }

    @Test
    void shouldHandleEmptyFile(@TempDir Path tempDir) throws Exception {
        Path emptyFile = tempDir.resolve("empty.txt");
        Files.createFile(emptyFile);

        String extracted = textExtractionService.extractText(emptyFile);

        assertNotNull(extracted);
        assertEquals("", extracted);
    }
}
