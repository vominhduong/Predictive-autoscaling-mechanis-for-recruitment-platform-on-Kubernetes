package com.example.user_service.storage;

import java.io.InputStream;

public interface ObjectStorage {
    StoredFile get(String key);

    record StoredFile(byte[] bytes, String contentType) {}

    void put(String key, InputStream data, long size, String contentType);

    void delete(String key);
}
