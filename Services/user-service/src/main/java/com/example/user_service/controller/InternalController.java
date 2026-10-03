package com.example.user_service.controller;

import com.example.user_service.common.ApiResponse;
import com.example.user_service.dto.*;
import com.example.user_service.service.*;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/internal")
public class InternalController {
    private final CvService cvs;
    private final CompanyService companies;
    private final ProfileService profiles;

    public InternalController(CvService c, CompanyService co, ProfileService p) {
        cvs = c;
        companies = co;
        profiles = p;
    }

    @GetMapping("/cvs/{cvId}/validation")
    public ApiResponse<CvDtos.Validation> cv(@PathVariable UUID cvId, @RequestParam UUID candidateId) {
        return ApiResponse.ok("CV validation completed", cvs.validateOwnership(cvId, candidateId));
    }

    @GetMapping("/companies/{companyId}/authorization")
    public ApiResponse<CompanyDtos.Authorization> company(@PathVariable UUID companyId, @RequestParam UUID userId) {
        return ApiResponse.ok("Company authorization completed", companies.authorization(companyId, userId));
    }

    @GetMapping("/notification-context")
    public ApiResponse<NotificationContext> notificationContext(@RequestParam UUID candidateId,
                                                                 @RequestParam UUID companyId) {
        return ApiResponse.ok("Notification context retrieved", new NotificationContext(
                profiles.notificationName(candidateId), companies.get(companyId).name()));
    }

    public record NotificationContext(String candidateName, String companyName) {
    }
}
