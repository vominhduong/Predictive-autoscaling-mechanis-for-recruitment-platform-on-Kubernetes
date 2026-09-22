package com.example.user_service.storage;
import com.example.user_service.exception.ApiException; import io.minio.*; import org.springframework.beans.factory.annotation.Value; import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty; import org.springframework.http.HttpStatus; import org.springframework.stereotype.Component; import java.io.InputStream;
@Component @ConditionalOnProperty(name="user-service.minio.enabled",havingValue="true",matchIfMissing=true) public class MinioObjectStorage implements ObjectStorage {
 private final MinioClient client; private final String bucket;
 public MinioObjectStorage(@Value("${user-service.minio.endpoint}") String endpoint,@Value("${user-service.minio.access-key}") String access,@Value("${user-service.minio.secret-key}") String secret,@Value("${user-service.minio.bucket}") String bucket){this.client=MinioClient.builder().endpoint(endpoint).credentials(access,secret).build();this.bucket=bucket;ensureBucket();}
 private void ensureBucket(){try{if(!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build()))client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());}catch(Exception e){throw unavailable();}}
 public void put(String key,InputStream data,long size,String type){try{client.putObject(PutObjectArgs.builder().bucket(bucket).object(key).stream(data,size,-1).contentType(type).build());}catch(Exception e){throw unavailable();}}
 public void delete(String key){try{client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());}catch(Exception e){throw unavailable();}}
 private ApiException unavailable(){return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"DEPENDENCY_UNAVAILABLE","Object storage is unavailable");}
}
