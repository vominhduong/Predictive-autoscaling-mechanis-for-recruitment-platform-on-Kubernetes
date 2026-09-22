package com.example.user_service.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "candidate_profiles")
public class CandidateProfile {
    @Id private UUID id;
    @Column(name="user_id", nullable=false, unique=true) private UUID userId;
    @Column(name="full_name", length=150) private String fullName;
    @Column(length=30) private String phone;
    private String headline;
    @Column(columnDefinition="text") private String summary;
    @Column(name="location_id") private UUID locationId;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="updated_at", nullable=false) private Instant updatedAt;
    @Version private long version;
    protected CandidateProfile() {}
    public CandidateProfile(UUID userId) { this.id=UUID.randomUUID(); this.userId=userId; this.createdAt=Instant.now(); this.updatedAt=this.createdAt; }
    public void update(String fullName,String phone,String headline,String summary,UUID locationId){this.fullName=fullName;this.phone=phone;this.headline=headline;this.summary=summary;this.locationId=locationId;this.updatedAt=Instant.now();}
    public UUID getId(){return id;} public UUID getUserId(){return userId;} public String getFullName(){return fullName;} public String getPhone(){return phone;} public String getHeadline(){return headline;} public String getSummary(){return summary;} public UUID getLocationId(){return locationId;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;} public long getVersion(){return version;}
}
