package com.example.job_service.controller;

import com.example.job_service.common.ApiResponse;
import com.example.job_service.dto.JobDtos;
import com.example.job_service.entity.*;
import com.example.job_service.exception.*;
import com.example.job_service.security.RequestIdentity;
import com.example.job_service.service.JobService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/jobs")
public class JobController {
    private final JobService jobs; public JobController(JobService jobs){this.jobs=jobs;}
    @GetMapping public ApiResponse<JobDtos.PageData<JobDtos.View>> search(@RequestParam(required=false)String keyword,@RequestParam(required=false)UUID locationId,@RequestParam(required=false)UUID categoryId,@RequestParam(required=false)BigDecimal salaryMin,@RequestParam(required=false)EmploymentType employmentType,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(defaultValue="newest")String sort){validatePage(page,size);return ApiResponse.ok("Jobs retrieved",jobs.search(keyword,locationId,categoryId,salaryMin,employmentType,page,size,sort));}
    @GetMapping("/{id}") public ApiResponse<JobDtos.View> detail(@PathVariable UUID id){return ApiResponse.ok("Job retrieved",jobs.publicDetail(id));}
    @PostMapping public ResponseEntity<ApiResponse<JobDtos.View>> create(@Valid @RequestBody JobDtos.Write body,RequestIdentity identity,HttpServletRequest request){employer(identity);return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Job created",jobs.create(body,identity.userId(),trace(request))));}
    @PutMapping("/{id}") public ApiResponse<JobDtos.View> update(@PathVariable UUID id,@Valid @RequestBody JobDtos.Write body,RequestIdentity identity,HttpServletRequest request){employer(identity);return ApiResponse.ok("Job updated",jobs.update(id,body,identity.userId(),trace(request)));}
    @PatchMapping("/{id}/status") public ApiResponse<JobDtos.View> status(@PathVariable UUID id,@Valid @RequestBody JobDtos.StatusChange body,RequestIdentity identity,HttpServletRequest request){employer(identity);return ApiResponse.ok("Job status updated",jobs.changeStatus(id,body,identity.userId(),trace(request)));}
    private void employer(RequestIdentity identity){if(!"EMPLOYER".equals(identity.role()))throw new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","Employer role is required");}
    private void validatePage(int page,int size){if(page<0||size<1||size>100)throw new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Page must be non-negative and size must be between 1 and 100");}
    private String trace(HttpServletRequest r){return String.valueOf(r.getAttribute(CorrelationIdFilter.ATTRIBUTE));}
}
