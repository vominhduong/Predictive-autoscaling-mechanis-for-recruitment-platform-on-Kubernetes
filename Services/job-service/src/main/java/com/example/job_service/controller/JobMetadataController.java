package com.example.job_service.controller;

import com.example.job_service.common.ApiResponse;
import com.example.job_service.dto.JobCategoryResponse;
import com.example.job_service.dto.JobLocationResponse;
import com.example.job_service.service.JobMetadataService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/jobs/metadata")
public class JobMetadataController {
    private final JobMetadataService metadata;

    public JobMetadataController(JobMetadataService metadata) {
        this.metadata = metadata;
    }

    @GetMapping("/categories")
    public ApiResponse<List<JobCategoryResponse>> categories() {
        return ApiResponse.ok("Job categories retrieved", metadata.getJobCategories());
    }

    @GetMapping("/locations")
    public ApiResponse<List<JobLocationResponse>> locations() {
        return ApiResponse.ok("Job locations retrieved", metadata.getJobLocations());
    }
}
