package com.example.job_service.service;

import com.example.job_service.client.CompanyAuthorizationClient;
import com.example.job_service.dto.JobDtos;
import com.example.job_service.entity.*;
import com.example.job_service.exception.*;
import com.example.job_service.repository.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class JobService {
    private final JobRepository jobs; private final CategoryRepository categories; private final LocationRepository locations;
    private final CompanyAuthorizationClient companies; private final JobRules rules; private final TransactionTemplate transactions;

    public JobService(JobRepository jobs, CategoryRepository categories, LocationRepository locations,
                      CompanyAuthorizationClient companies, JobRules rules, PlatformTransactionManager transactionManager) {
        this.jobs=jobs;this.categories=categories;this.locations=locations;this.companies=companies;this.rules=rules;this.transactions=new TransactionTemplate(transactionManager);
    }

    @Transactional(readOnly=true)
    public JobDtos.PageData<JobDtos.View> search(String keyword, UUID locationId, UUID categoryId,
                                                  BigDecimal salaryMin, EmploymentType type,
                                                  int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, size, sort(sort));
        Page<Job> result = jobs.findAll(JobSpecifications.publicJobs(keyword, locationId, categoryId, salaryMin, type), pageable);
        return page(result);
    }

    @Transactional(readOnly=true)
    public JobDtos.View publicDetail(UUID id) {
        Job job = find(id);
        if (job.getStatus()!=JobStatus.PUBLISHED || job.getApplicationDeadline().isBefore(LocalDate.now()))
            throw new ApiException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", "Job was not found");
        return view(job);
    }

    public JobDtos.View create(JobDtos.Write request, UUID userId, String traceId) {
        validate(request); companies.requireManage(request.companyId(), userId, traceId);
        return transactions.execute(status -> persistCreate(request, userId));
    }

    @Transactional
    protected JobDtos.View persistCreate(JobDtos.Write x, UUID userId) {
        Job job = new Job(x.companyId(), userId, x.title(), x.description(), x.requirements(), x.locationId(),
                x.categoryId(), x.employmentType(), x.salaryMin(), x.salaryMax(), x.salaryCurrency(),
                x.salaryNegotiable(), x.applicationDeadline());
        return view(jobs.save(job));
    }

    public JobDtos.View update(UUID id, JobDtos.Write request, UUID userId, String traceId) {
        Job snapshot = find(id);
        if (!snapshot.getCompanyId().equals(request.companyId()))
            throw new ApiException(HttpStatus.BAD_REQUEST, "IMMUTABLE_COMPANY", "Company cannot be changed");
        validate(request); companies.requireManage(snapshot.getCompanyId(), userId, traceId);
        return transactions.execute(status -> persistUpdate(id, request));
    }

    @Transactional
    protected JobDtos.View persistUpdate(UUID id, JobDtos.Write x) {
        Job job=find(id); checkVersion(job,x.version());
        job.update(x.title(),x.description(),x.requirements(),x.locationId(),x.categoryId(),x.employmentType(),
                x.salaryMin(),x.salaryMax(),x.salaryCurrency(),x.salaryNegotiable(),x.applicationDeadline());
        return view(jobs.saveAndFlush(job));
    }

    public JobDtos.View changeStatus(UUID id, JobDtos.StatusChange request, UUID userId, String traceId) {
        Job snapshot=find(id); companies.requireManage(snapshot.getCompanyId(),userId,traceId);
        return transactions.execute(status -> persistStatus(id,request));
    }

    @Transactional
    protected JobDtos.View persistStatus(UUID id, JobDtos.StatusChange x) {
        Job job=find(id);checkVersion(job,x.version());rules.validateTransition(job.getStatus(),x.status(),job.getApplicationDeadline());
        job.changeStatus(x.status());return view(jobs.saveAndFlush(job));
    }

    public JobDtos.PageData<JobDtos.View> employerJobs(UUID companyId, JobStatus status, int page, int size,
                                                       UUID userId, String traceId) {
        companies.requireManage(companyId,userId,traceId);return loadEmployerJobs(companyId,status,page,size);
    }

    @Transactional(readOnly=true)
    protected JobDtos.PageData<JobDtos.View> loadEmployerJobs(UUID companyId,JobStatus status,int page,int size){
        var spec=(org.springframework.data.jpa.domain.Specification<Job>)(root,q,cb)->cb.equal(root.get("companyId"),companyId);
        if(status!=null)spec=spec.and((root,q,cb)->cb.equal(root.get("status"),status));
        return page(jobs.findAll(spec,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"createdAt"))));
    }

    @Transactional(readOnly=true)
    public JobDtos.Eligibility eligibility(UUID id){Job j=find(id);boolean accepting=j.getStatus()==JobStatus.PUBLISHED&&!j.getApplicationDeadline().isBefore(LocalDate.now());return new JobDtos.Eligibility(j.getId(),j.getCompanyId(),j.getCreatedBy(),j.getTitle(),j.getStatus(),j.getApplicationDeadline(),accepting,j.getVersion());}

    private void validate(JobDtos.Write x){rules.validateSalary(x.salaryMin(),x.salaryMax());rules.validateDeadline(x.applicationDeadline());
        Category c=categories.findById(x.categoryId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"CATEGORY_NOT_FOUND","Category was not found"));if(!c.isActive())throw new ApiException(HttpStatus.CONFLICT,"CATEGORY_INACTIVE","Category is inactive");
        Location l=locations.findById(x.locationId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"LOCATION_NOT_FOUND","Location was not found"));if(!l.isActive())throw new ApiException(HttpStatus.CONFLICT,"LOCATION_INACTIVE","Location is inactive");}
    private Job find(UUID id){return jobs.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"JOB_NOT_FOUND","Job was not found"));}
    private void checkVersion(Job j,Long v){if(v==null||j.getVersion()!=v)throw new ApiException(HttpStatus.CONFLICT,"OPTIMISTIC_LOCK_CONFLICT","The job was updated by another request");}
    private Sort sort(String value){return switch(value==null?"newest":value){case "newest","createdAt,desc"->Sort.by(Sort.Direction.DESC,"createdAt");case "oldest","createdAt,asc"->Sort.by("createdAt");case "salaryAsc"->Sort.by(Sort.Direction.ASC,"salaryMin");case "salaryDesc"->Sort.by(Sort.Direction.DESC,"salaryMax");default->throw new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Unsupported sort value");};}
    private JobDtos.PageData<JobDtos.View> page(Page<Job> p){return new JobDtos.PageData<>(p.stream().map(this::view).toList(),p.getNumber(),p.getSize(),p.getTotalElements(),p.getTotalPages(),p.isFirst(),p.isLast());}
    private JobDtos.View view(Job j){Category c=categories.findById(j.getCategoryId()).orElseThrow();Location l=locations.findById(j.getLocationId()).orElseThrow();return new JobDtos.View(j.getId(),j.getCompanyId(),j.getTitle(),j.getDescription(),j.getRequirements(),new JobDtos.Summary(l.getId(),l.getName(),l.getSlug()),new JobDtos.Summary(c.getId(),c.getName(),c.getSlug()),j.getEmploymentType(),j.getSalaryMin(),j.getSalaryMax(),j.getSalaryCurrency(),j.isSalaryNegotiable(),j.getStatus(),j.getApplicationDeadline(),j.getPublishedAt(),j.getCreatedAt(),j.getUpdatedAt(),j.getVersion());}
}
