package com.example.job_service.controller;

import com.example.job_service.common.ApiResponse;import com.example.job_service.dto.JobDtos;import com.example.job_service.service.JobService;import org.springframework.web.bind.annotation.*;import java.util.UUID;
@RestController @RequestMapping("/internal/jobs") public class InternalJobController {private final JobService jobs;public InternalJobController(JobService jobs){this.jobs=jobs;}@GetMapping("/{id}/eligibility") public ApiResponse<JobDtos.Eligibility> eligibility(@PathVariable UUID id){return ApiResponse.ok("Job eligibility retrieved",jobs.eligibility(id));}}
