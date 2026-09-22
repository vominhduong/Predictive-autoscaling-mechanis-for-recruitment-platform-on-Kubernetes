package com.example.user_service.controller;
import com.example.user_service.common.ApiResponse; import com.example.user_service.dto.*; import com.example.user_service.service.*; import org.springframework.web.bind.annotation.*; import java.util.UUID;
@RestController @RequestMapping("/internal") public class InternalController {private final CvService cvs;private final CompanyService companies;public InternalController(CvService c,CompanyService co){cvs=c;companies=co;}
 @GetMapping("/cvs/{cvId}/validation") public ApiResponse<CvDtos.Validation> cv(@PathVariable UUID cvId,@RequestParam UUID candidateId){return ApiResponse.ok("CV validation completed",cvs.validateOwnership(cvId,candidateId));}
 @GetMapping("/companies/{companyId}/authorization") public ApiResponse<CompanyDtos.Authorization> company(@PathVariable UUID companyId,@RequestParam UUID userId){return ApiResponse.ok("Company authorization completed",companies.authorization(companyId,userId));}
}
