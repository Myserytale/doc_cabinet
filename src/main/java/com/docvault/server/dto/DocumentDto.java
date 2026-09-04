package com.docvault.server.dto;

import com.docvault.server.model.Document;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentDto(
        UUID id,
        String title,
        String originalFilename,
        String mimeType,
        Long sizeBytes,
        String storagePath,
        String checksum,
        String status,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static DocumentDto from(Document doc) {
        return new DocumentDto(
                doc.getId(),
                doc.getTitle(),
                doc.getOriginalFilename(),
                doc.getMimeType(),
                doc.getSizeBytes(),
                doc.getStoragePath(),
                doc.getChecksum(),
                doc.getStatus(),
                doc.getErrorMessage(),
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
