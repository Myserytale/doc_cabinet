package com.docvault.server.dto;

import java.util.UUID;

public record CategoryDto(
        UUID id,
        String name,
        String color,
        long documentCount
) {}
