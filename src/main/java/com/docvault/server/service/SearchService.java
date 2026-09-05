package com.docvault.server.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import com.docvault.server.dto.DocumentSearchResponse;
import com.docvault.server.dto.DocumentSearchResultItem;
import com.docvault.server.dto.IndexedDocument;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SearchService {

    private static final Logger log = LoggerFactory.getLogger(SearchService.class);
    public static final String INDEX_NAME = "documents";

    private final ElasticsearchClient elasticsearchClient;

    public SearchService(ElasticsearchClient elasticsearchClient) {
        this.elasticsearchClient = elasticsearchClient;
    }

    @PostConstruct
    public void initIndex() {
        try {
            boolean exists = elasticsearchClient.indices()
                    .exists(e -> e.index(INDEX_NAME))
                    .value();

            if (!exists) {
                elasticsearchClient.indices().create(c -> c
                        .index(INDEX_NAME)
                        .mappings(m -> m
                                .properties("id", p -> p.keyword(k -> k))
                                .properties("userId", p -> p.keyword(k -> k))
                                .properties("title", p -> p.text(t -> t
                                        .fields("keyword", k -> k.keyword(kw -> kw.ignoreAbove(256)))
                                ))
                                .properties("originalFilename", p -> p.text(t -> t
                                        .fields("keyword", k -> k.keyword(kw -> kw.ignoreAbove(256)))
                                ))
                                .properties("mimeType", p -> p.keyword(k -> k))
                                .properties("sizeBytes", p -> p.long_(l -> l))
                                .properties("checksum", p -> p.keyword(k -> k))
                                .properties("categoryId", p -> p.keyword(k -> k))
                                .properties("categoryName", p -> p.keyword(k -> k))
                                .properties("content", p -> p.text(t -> t))
                                .properties("createdAt", p -> p.date(d -> d))
                        )
                );
                log.info("Created Elasticsearch index '{}' successfully", INDEX_NAME);
            } else {
                log.info("Elasticsearch index '{}' already exists", INDEX_NAME);
            }
        } catch (Exception e) {
            log.error("Could not verify or create Elasticsearch index '{}': {}", INDEX_NAME, e.getMessage());
        }
    }

    public void indexDocument(IndexedDocument doc) {
        try {
            elasticsearchClient.index(i -> i
                    .index(INDEX_NAME)
                    .id(doc.getId())
                    .document(doc)
                    .refresh(co.elastic.clients.elasticsearch._types.Refresh.True)
            );
            log.info("Document {} indexed into Elasticsearch", doc.getId());
        } catch (Exception e) {
            log.error("Failed to index document {}: {}", doc.getId(), e.getMessage(), e);
            throw new RuntimeException("Elasticsearch indexing failed: " + e.getMessage(), e);
        }
    }

    public void deleteDocument(String documentId) {
        try {
            elasticsearchClient.delete(d -> d
                    .index(INDEX_NAME)
                    .id(documentId)
                    .refresh(co.elastic.clients.elasticsearch._types.Refresh.True)
            );
            log.info("Deleted document {} from Elasticsearch", documentId);
        } catch (Exception e) {
            log.warn("Could not delete document {} from Elasticsearch: {}", documentId, e.getMessage());
        }
    }

    public DocumentSearchResponse searchDocuments(UUID userId, String query, int page, int size) {
        return searchDocuments(userId, query, null, page, size);
    }

    public DocumentSearchResponse searchDocuments(UUID userId, String query, UUID categoryId, int page, int size) {
        try {
            int validPage = Math.max(0, page);
            int validSize = Math.max(1, size);
            int from = validPage * validSize;

            SearchResponse<IndexedDocument> response = elasticsearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .from(from)
                    .size(validSize)
                    .query(q -> q
                            .bool(b -> {
                                b.filter(f -> f.term(t -> t.field("userId").value(userId.toString())));
                                if (categoryId != null) {
                                    b.filter(f -> f.term(t -> t.field("categoryId").value(categoryId.toString())));
                                }
                                if (query != null && !query.trim().isEmpty()) {
                                    b.must(m -> m.multiMatch(mm -> mm
                                            .query(query.trim())
                                            .fields("title^3", "originalFilename^2", "content^1")
                                            .fuzziness("AUTO")
                                    ));
                                } else {
                                    b.must(m -> m.matchAll(ma -> ma));
                                }
                                return b;
                            })
                    )
                    .highlight(h -> h
                            .preTags("<mark>")
                            .postTags("</mark>")
                            .fields("content", hf -> hf.numberOfFragments(3).fragmentSize(150))
                            .fields("title", hf -> hf.numberOfFragments(1))
                            .fields("originalFilename", hf -> hf.numberOfFragments(1))
                    ),
                    IndexedDocument.class
            );

            List<DocumentSearchResultItem> items = new ArrayList<>();
            for (Hit<IndexedDocument> hit : response.hits().hits()) {
                IndexedDocument source = hit.source();
                if (source == null) continue;

                List<String> highlights = new ArrayList<>();
                if (hit.highlight() != null) {
                    hit.highlight().forEach((field, fragments) -> highlights.addAll(fragments));
                }

                items.add(new DocumentSearchResultItem(
                        UUID.fromString(source.getId()),
                        source.getTitle(),
                        source.getOriginalFilename(),
                        source.getMimeType(),
                        source.getSizeBytes(),
                        source.getChecksum(),
                        source.getCategoryId(),
                        source.getCategoryName(),
                        source.getCreatedAt(),
                        hit.score(),
                        highlights
                ));
            }

            long totalHits = response.hits().total() != null ? response.hits().total().value() : items.size();
            return new DocumentSearchResponse(items, totalHits, validPage, validSize);
        } catch (Exception e) {
            log.error("Search failed for user {} with query '{}': {}", userId, query, e.getMessage(), e);
            throw new RuntimeException("Search failed: " + e.getMessage(), e);
        }
    }
}
