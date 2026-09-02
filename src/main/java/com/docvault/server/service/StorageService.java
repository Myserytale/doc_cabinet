package com.docvault.server.service;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.GetObjectArgs;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.UUID;

@Service
public class StorageService {

    private final MinioClient minioClient;
    private final String bucketName;

    public StorageService(
            @Value("${docvault.minio.url}") String url,
            @Value("${docvault.minio.access-key}") String accessKey,
            @Value("${docvault.minio.secret-key}") String secretKey,
            @Value("${docvault.minio.bucket}") String bucketName) {
        
        this.minioClient = MinioClient.builder()
                .endpoint(url)
                .credentials(accessKey, secretKey)
                .build();
        this.bucketName = bucketName;
    }

    @PostConstruct
    public void init() {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Error initializing Minio", e);
        }
    }

    public String storeFile(UUID userId, String originalFilename, InputStream stream, String contentType) {
        String objectName = userId.toString() + "/" + UUID.randomUUID().toString() + "-" + originalFilename;
        try {
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .stream(stream, -1, 10485760) // Part size 10MB
                    .contentType(contentType)
                    .build());
            return objectName;
        } catch (Exception e) {
            throw new RuntimeException("Error storing file", e);
        }
    }

    public InputStream getFile(String objectName) {
        try {
            return minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Error retrieving file", e);
        }
    }
}
