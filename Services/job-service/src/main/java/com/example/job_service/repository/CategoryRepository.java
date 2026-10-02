package com.example.job_service.repository;

import com.example.job_service.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    java.util.List<Category> findByActiveTrueOrderByNameAsc();
    boolean existsBySlug(String slug);
}
