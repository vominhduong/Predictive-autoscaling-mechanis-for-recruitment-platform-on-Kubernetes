package com.example.user_service.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="companies")
public class Company {
    @Id private UUID id;
    @Column(nullable=false) private String name;
    @Column(columnDefinition="text") private String description;
    @Column(length=500) private String address;
    @Column(name="logo_object_key", length=500) private String logoObjectKey;
    @Column(nullable=false) private String status;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="updated_at", nullable=false) private Instant updatedAt;
    @Version private long version;
    protected Company() {}
    public Company(String name,String description,String address){this.id=UUID.randomUUID();this.name=name;this.description=description;this.address=address;this.status="ACTIVE";this.createdAt=Instant.now();this.updatedAt=this.createdAt;}
    public void update(String name,String description,String address){this.name=name;this.description=description;this.address=address;this.updatedAt=Instant.now();}
    public UUID getId(){return id;} public String getName(){return name;} public String getDescription(){return description;} public String getAddress(){return address;} public String getStatus(){return status;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;} public long getVersion(){return version;}
}
