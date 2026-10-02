package com.example.job_service.dto;

import java.util.UUID;

public record JobCategoryResponse(UUID id, String name, String slug) {
}
