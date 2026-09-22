package com.example.user_service.dto;
import jakarta.validation.constraints.Size; import java.time.Instant; import java.util.UUID;
public final class ProfileDtos {private ProfileDtos(){} public record Update(@Size(max=150) String fullName,@Size(max=30) String phone,@Size(max=255) String headline,@Size(max=5000) String summary,UUID locationId){} public record View(UUID id,UUID userId,String fullName,String phone,String headline,String summary,UUID locationId,Instant createdAt,Instant updatedAt,long version){} }
