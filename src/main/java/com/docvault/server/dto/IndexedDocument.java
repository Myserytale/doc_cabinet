package com.docvault.server.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public class IndexedDocument {

    private String id;
    private String userId;
    private String title;
    private String originalFilename;
    private String mimeType;
    private Long sizeBytes;
    private String checksum;
    private String content;
    private Instant createdAt;

    public IndexedDocument() {}

    public IndexedDocument(String id, String userId, String title, String originalFilename,
                           String mimeType, Long sizeBytes, String checksum,
                           String content, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.originalFilename = originalFilename;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.checksum = checksum;
        this.content = content;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }

    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
