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
        UUID categoryId,
        String categoryName,
        String categoryColor,
        String sourcePath,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static DocumentDto from(Document doc) {
        UUID catId = doc.getCategory() != null ? doc.getCategory().getId() : null;
        String catName = doc.getCategory() != null ? doc.getCategory().getName() : null;
        String catColor = doc.getCategory() != null ? doc.getCategory().getColor() : null;

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
                catId,
                catName,
                catColor,
                doc.getSourcePath(),
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
