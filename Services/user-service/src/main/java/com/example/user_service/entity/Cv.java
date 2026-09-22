package com.example.user_service.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="cvs")
public class Cv {
    @Id private UUID id;
    @Column(name="candidate_id", nullable=false) private UUID candidateId;
    @Column(name="file_name", nullable=false) private String fileName;
    @Column(name="object_key", nullable=false, unique=true, length=500) private String objectKey;
    @Column(name="content_type", nullable=false, length=100) private String contentType;
    @Column(name="size_bytes", nullable=false) private long sizeBytes;
    @Column(name="is_default", nullable=false) private boolean defaultCv;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    protected Cv() {}
    public Cv(UUID candidateId,String fileName,String objectKey,String contentType,long sizeBytes,boolean defaultCv){this.id=UUID.randomUUID();this.candidateId=candidateId;this.fileName=fileName;this.objectKey=objectKey;this.contentType=contentType;this.sizeBytes=sizeBytes;this.defaultCv=defaultCv;this.createdAt=Instant.now();}
    public UUID getId(){return id;} public UUID getCandidateId(){return candidateId;} public String getFileName(){return fileName;} public String getObjectKey(){return objectKey;} public String getContentType(){return contentType;} public long getSizeBytes(){return sizeBytes;} public boolean isDefaultCv(){return defaultCv;} public Instant getCreatedAt(){return createdAt;}
}
