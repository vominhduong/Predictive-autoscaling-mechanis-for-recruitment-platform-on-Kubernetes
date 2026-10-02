package com.example.job_service.service;

import com.example.job_service.dto.JobCategoryResponse;
import com.example.job_service.dto.JobLocationResponse;
import com.example.job_service.repository.CategoryRepository;
import com.example.job_service.repository.LocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class JobMetadataService {
    private final CategoryRepository categories;
    private final LocationRepository locations;

    public JobMetadataService(CategoryRepository categories, LocationRepository locations) {
        this.categories = categories;
        this.locations = locations;
    }

    public List<JobCategoryResponse> getJobCategories() {
        return categories.findByActiveTrueOrderByNameAsc().stream()
                .map(c -> new JobCategoryResponse(c.getId(), c.getName(), c.getSlug())).toList();
    }

    public List<JobLocationResponse> getJobLocations() {
        return locations.findByActiveTrueOrderByNameAsc().stream()
                .map(l -> new JobLocationResponse(l.getId(), l.getName(), l.getSlug())).toList();
    }
}
