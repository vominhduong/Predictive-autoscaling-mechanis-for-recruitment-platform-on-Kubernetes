package com.example.user_service.repository;
import com.example.user_service.entity.*; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface CompanyMemberRepository extends JpaRepository<CompanyMember,UUID>{Optional<CompanyMember> findByCompanyIdAndUserId(UUID companyId,UUID userId); boolean existsByCompanyIdAndUserId(UUID companyId,UUID userId);}
