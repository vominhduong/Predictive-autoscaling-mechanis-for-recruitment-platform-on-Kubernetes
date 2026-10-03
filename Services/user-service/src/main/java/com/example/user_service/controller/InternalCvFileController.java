package com.example.user_service.controller;

import com.example.user_service.storage.ObjectStorage;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Only reachable with the internal service token; public authorization lives in application-service. */
@RestController
@RequestMapping("/internal/cv-file")
public class InternalCvFileController {
    private final ObjectStorage storage;

    public InternalCvFileController(ObjectStorage storage) {
        this.storage = storage;
    }

    @GetMapping
    public ResponseEntity<byte[]> get(@RequestParam String objectKey) {
        var file = storage.get(objectKey);
        MediaType type;
        try {
            type = MediaType.parseMediaType(file.contentType());
        } catch (IllegalArgumentException e) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(type)
                .contentLength(file.bytes().length).body(file.bytes());
    }
}
