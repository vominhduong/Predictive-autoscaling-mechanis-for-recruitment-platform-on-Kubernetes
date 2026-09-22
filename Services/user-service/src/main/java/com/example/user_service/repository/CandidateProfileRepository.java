package com.example.user_service.repository;
import com.example.user_service.entity.CandidateProfile; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile,UUID>{Optional<CandidateProfile> findByUserId(UUID userId);}
