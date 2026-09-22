package com.example.user_service.security;
import com.example.user_service.exception.ApiException; import org.springframework.http.HttpStatus; import java.util.UUID;
public record RequestIdentity(UUID userId,String email,String role){
 public boolean candidate(){return "CANDIDATE".equals(role);} public boolean employer(){return "EMPLOYER".equals(role);}
 public void requireCandidate(){if(!candidate())throw new ApiException(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Candidate role is required");}
 public void requireEmployer(){if(!employer())throw new ApiException(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Employer role is required");}
}
