package com.example.job_service;

import com.example.job_service.entity.JobStatus;
import com.example.job_service.exception.ApiException;
import com.example.job_service.service.JobRules;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;

class JobRulesTest {private final JobRules rules=new JobRules();
 @Test void validatesSalaryRanges(){assertThatCode(()->rules.validateSalary(null,null)).doesNotThrowAnyException();assertThatCode(()->rules.validateSalary(BigDecimal.ONE,BigDecimal.TEN)).doesNotThrowAnyException();assertThatThrownBy(()->rules.validateSalary(BigDecimal.TEN,BigDecimal.ONE)).isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_SALARY_RANGE");assertThatThrownBy(()->rules.validateSalary(BigDecimal.valueOf(-1),null)).isInstanceOf(ApiException.class);}
 @Test void requiresFutureDeadline(){assertThatThrownBy(()->rules.validateDeadline(LocalDate.now())).isInstanceOf(ApiException.class);assertThatCode(()->rules.validateDeadline(LocalDate.now().plusDays(1))).doesNotThrowAnyException();}
 @Test void enforcesStatusTransitions(){assertThatCode(()->rules.validateTransition(JobStatus.DRAFT,JobStatus.PUBLISHED,LocalDate.now().plusDays(1))).doesNotThrowAnyException();assertThatCode(()->rules.validateTransition(JobStatus.PUBLISHED,JobStatus.HIDDEN,LocalDate.now().plusDays(1))).doesNotThrowAnyException();assertThatThrownBy(()->rules.validateTransition(JobStatus.CLOSED,JobStatus.PUBLISHED,LocalDate.now().plusDays(1))).isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_JOB_STATUS_TRANSITION");}
}
