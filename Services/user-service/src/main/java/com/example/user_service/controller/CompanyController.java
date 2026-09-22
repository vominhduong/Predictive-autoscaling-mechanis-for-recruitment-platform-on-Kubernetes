package com.example.user_service.controller;
import com.example.user_service.common.ApiResponse; import com.example.user_service.dto.CompanyDtos; import com.example.user_service.security.RequestIdentity; import com.example.user_service.service.CompanyService; import jakarta.validation.Valid; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.UUID;
@RestController @RequestMapping("/api/v1/companies") public class CompanyController {private final CompanyService service;public CompanyController(CompanyService s){service=s;}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public ApiResponse<CompanyDtos.View> create(RequestIdentity i,@Valid @RequestBody CompanyDtos.Upsert x){i.requireEmployer();return ApiResponse.ok("Company created",service.create(i.userId(),x));}
 @GetMapping("/{id}") public ApiResponse<CompanyDtos.View> get(@PathVariable UUID id){return ApiResponse.ok("Company retrieved",service.get(id));}
 @PutMapping("/{id}") public ApiResponse<CompanyDtos.View> update(RequestIdentity i,@PathVariable UUID id,@Valid @RequestBody CompanyDtos.Upsert x){i.requireEmployer();return ApiResponse.ok("Company updated",service.update(id,i.userId(),x));}
 @PostMapping("/{id}/members") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Void> add(RequestIdentity i,@PathVariable UUID id,@Valid @RequestBody CompanyDtos.AddMember x){i.requireEmployer();service.addMember(id,i.userId(),x.userId(),x.role());return ApiResponse.ok("Company member added",null);}
}
