package com.example.user_service.controller;
import com.example.user_service.common.ApiResponse; import com.example.user_service.dto.*; import com.example.user_service.security.RequestIdentity; import com.example.user_service.service.*; import jakarta.validation.Valid; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile; import java.util.*;
@RestController @RequestMapping("/api/v1/candidates/me") public class CandidateController {private final ProfileService profiles;private final CvService cvs;public CandidateController(ProfileService p,CvService c){profiles=p;cvs=c;}
 @GetMapping public ApiResponse<ProfileDtos.View> get(RequestIdentity i){i.requireCandidate();return ApiResponse.ok("Candidate profile retrieved",profiles.get(i.userId()));}
 @PutMapping public ApiResponse<ProfileDtos.View> update(RequestIdentity i,@Valid @RequestBody ProfileDtos.Update x){i.requireCandidate();return ApiResponse.ok("Candidate profile updated",profiles.update(i.userId(),x));}
 @PostMapping(value="/cvs",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.CREATED) public ApiResponse<CvDtos.View> upload(RequestIdentity i,@RequestPart("file") MultipartFile file,@RequestParam(defaultValue="false") boolean isDefault){i.requireCandidate();return ApiResponse.ok("CV uploaded",cvs.upload(i.userId(),file,isDefault));}
 @GetMapping("/cvs") public ApiResponse<List<CvDtos.View>> list(RequestIdentity i){i.requireCandidate();return ApiResponse.ok("CVs retrieved",cvs.list(i.userId()));}
 @DeleteMapping("/cvs/{cvId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(RequestIdentity i,@PathVariable UUID cvId){i.requireCandidate();cvs.delete(i.userId(),cvId);}
}
