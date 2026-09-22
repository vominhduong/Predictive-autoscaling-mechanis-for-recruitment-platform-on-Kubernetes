package com.example.user_service.repository;
import com.example.user_service.entity.Company; import org.springframework.data.jpa.repository.JpaRepository; import java.util.UUID;
public interface CompanyRepository extends JpaRepository<Company,UUID>{}
