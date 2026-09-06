package com.docvault.server.repository;

import com.docvault.server.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByUserId(UUID userId);
    List<Document> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Document> findByUserIdAndCategoryIdOrderByCreatedAtDesc(UUID userId, UUID categoryId);
    List<Document> findByUserIdAndSourcePathStartingWithOrderByCreatedAtDesc(UUID userId, String sourcePathPrefix);
    List<Document> findByUserIdAndCategoryIdAndSourcePathStartingWithOrderByCreatedAtDesc(UUID userId, UUID categoryId, String sourcePathPrefix);
    List<Document> findByUserIdAndSourcePathIsNullOrderByCreatedAtDesc(UUID userId);
    List<Document> findByUserIdAndCategoryIdAndSourcePathIsNullOrderByCreatedAtDesc(UUID userId, UUID categoryId);
    Optional<Document> findByIdAndUserId(UUID id, UUID userId);
    Optional<Document> findByUserIdAndChecksum(UUID userId, String checksum);

    @Query("SELECT DISTINCT d.sourcePath FROM Document d WHERE d.user.id = :userId AND d.sourcePath IS NOT NULL")
    List<String> findDistinctSourcePathsByUserId(@Param("userId") UUID userId);

    long countByUserIdAndSourcePathIsNull(UUID userId);
}
