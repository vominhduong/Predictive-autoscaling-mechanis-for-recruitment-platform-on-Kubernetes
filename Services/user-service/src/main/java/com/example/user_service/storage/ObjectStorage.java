package com.example.user_service.storage;
import java.io.InputStream;
public interface ObjectStorage {void put(String key,InputStream data,long size,String contentType);void delete(String key);}
