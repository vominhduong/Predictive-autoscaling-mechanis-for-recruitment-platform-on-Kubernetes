package com.example.job_service.dto;

import java.util.UUID;

public record JobLocationResponse(UUID id, String name, String slug) {
}
