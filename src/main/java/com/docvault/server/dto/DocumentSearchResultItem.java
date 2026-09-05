package com.docvault.server.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DocumentSearchResultItem(
        UUID id,
        String title,
        String originalFilename,
        String mimeType,
        Long sizeBytes,
        String checksum,
        String categoryId,
        String categoryName,
        Instant createdAt,
        Double score,
        List<String> highlights
) {}
