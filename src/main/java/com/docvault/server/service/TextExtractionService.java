package com.docvault.server.service;

import org.apache.tika.io.TikaInputStream;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.file.Path;

@Service
public class TextExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TextExtractionService.class);

    // Limit extracted text to 5 million characters to prevent OOM
    private static final int MAX_TEXT_CHARS = 5 * 1024 * 1024;

    private final AutoDetectParser parser = new AutoDetectParser();

    /**
     * Extracts plain text from the given file using Apache Tika.
     * Supports formats such as PDF, DOCX, TXT, CSV, HTML, RTF, PPTX, XLSX, etc.
     */
    public String extractText(Path filePath) throws Exception {
        if (java.nio.file.Files.exists(filePath) && java.nio.file.Files.size(filePath) == 0) {
            log.debug("File {} is empty, returning empty string", filePath);
            return "";
        }

        Metadata metadata = new Metadata();
        ParseContext context = new ParseContext();
        BodyContentHandler handler = new BodyContentHandler(MAX_TEXT_CHARS);

        try (TikaInputStream stream = TikaInputStream.get(filePath, metadata)) {
            parser.parse(stream, handler, metadata, context);
            String text = handler.toString().trim();
            log.debug("Extracted {} characters from {}", text.length(), filePath);
            return text;
        } catch (org.apache.tika.exception.ZeroByteFileException e) {
            log.debug("ZeroByteFileException encountered for {}, returning empty string", filePath);
            return "";
        }
    }
}
