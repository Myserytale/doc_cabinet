package com.docvault.server.dto;

import java.util.List;

public record DocumentSearchResponse(
        List<DocumentSearchResultItem> items,
        long totalHits,
        int page,
        int size
) {}
