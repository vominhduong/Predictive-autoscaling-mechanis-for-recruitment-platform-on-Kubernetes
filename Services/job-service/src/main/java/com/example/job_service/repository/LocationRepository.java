package com.example.job_service.repository;

import com.example.job_service.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LocationRepository extends JpaRepository<Location, UUID> {
    java.util.List<Location> findByActiveTrueOrderByNameAsc();
    boolean existsBySlug(String slug);
}
