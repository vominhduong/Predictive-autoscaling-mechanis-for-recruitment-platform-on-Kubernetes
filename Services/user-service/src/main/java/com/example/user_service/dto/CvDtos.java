package com.example.user_service.dto;
import java.time.Instant; import java.util.UUID;
public final class CvDtos {private CvDtos(){} public record View(UUID id,String fileName,String contentType,long sizeBytes,boolean isDefault,Instant createdAt){} public record Validation(UUID cvId,UUID candidateId,String fileName,String objectKey,String contentType,long sizeBytes,boolean valid){} }
