package com.example.user_service.repository;
import com.example.user_service.entity.Cv; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface CvRepository extends JpaRepository<Cv,UUID>{List<Cv> findAllByCandidateIdOrderByCreatedAtDesc(UUID candidateId); Optional<Cv> findByIdAndCandidateId(UUID id,UUID candidateId);}
