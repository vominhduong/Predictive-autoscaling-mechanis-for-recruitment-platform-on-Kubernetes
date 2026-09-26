package com.example.job_service.configuration;

import com.example.job_service.common.ApiErrorResponse;
import com.example.job_service.exception.CorrelationIdFilter;
import tools.jackson.databind.json.JsonMapper;
import jakarta.servlet.*;import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class InternalApiFilter extends OncePerRequestFilter {
    private final byte[] expected; private final JsonMapper mapper;
    public InternalApiFilter(@Value("${job-service.internal-token}") String expected,JsonMapper mapper){this.expected=expected.getBytes(StandardCharsets.UTF_8);this.mapper=mapper;}
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
        if(!req.getRequestURI().startsWith("/internal/")){chain.doFilter(req,res);return;}
        String value=req.getHeader("X-Internal-Token");byte[] supplied=(value==null?"":value).getBytes(StandardCharsets.UTF_8);
        if(expected.length==0||!MessageDigest.isEqual(expected,supplied)){String trace=String.valueOf(req.getAttribute(CorrelationIdFilter.ATTRIBUTE));res.setStatus(401);res.setContentType(MediaType.APPLICATION_JSON_VALUE);mapper.writeValue(res.getOutputStream(),new ApiErrorResponse("INTERNAL_AUTHENTICATION_FAILED","Valid internal service credential is required",List.of(),trace));return;}
        chain.doFilter(req,res);
    }
}
