package com.example.user_service.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="company_members", uniqueConstraints=@UniqueConstraint(name="uk_company_members_company_user", columnNames={"company_id","user_id"}))
public class CompanyMember {
    @Id private UUID id;
    @Column(name="company_id", nullable=false) private UUID companyId;
    @Column(name="user_id", nullable=false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(name="member_role", nullable=false) private MemberRole memberRole;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    protected CompanyMember() {}
    public CompanyMember(UUID companyId,UUID userId,MemberRole role){this.id=UUID.randomUUID();this.companyId=companyId;this.userId=userId;this.memberRole=role;this.createdAt=Instant.now();}
    public UUID getId(){return id;} public UUID getCompanyId(){return companyId;} public UUID getUserId(){return userId;} public MemberRole getMemberRole(){return memberRole;} public Instant getCreatedAt(){return createdAt;}
}
