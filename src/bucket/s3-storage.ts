import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { DocumentStorageConfig } from "@/bucket/config";
import type {
  ObjectStorageDriver,
  StorageGetObjectInput,
  StorageListObjectsInput,
  StorageGetObjectOutput,
  StoragePutObjectInput,
  StorageSignedReadUrlInput,
} from "@/bucket/types";

function isBucketMissingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const metadata =
    "$metadata" in error && typeof error.$metadata === "object" && error.$metadata
      ? error.$metadata
      : undefined;
  const statusCode =
    metadata && "httpStatusCode" in metadata ? Number(metadata.httpStatusCode) : 0;

  return name === "NotFound" || name === "NoSuchBucket" || statusCode === 404;
}

function isBucketAlreadyCreatedError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";

  return name === "BucketAlreadyOwnedByYou" || name === "BucketAlreadyExists";
}

export class S3StorageDriver implements ObjectStorageDriver {
  private readonly client: S3Client;
  private readonly ensuredBuckets = new Map<string, Promise<void>>();

  constructor(private readonly config: DocumentStorageConfig) {
    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      region: config.region,
    });
  }

  async ensureBucket(bucket: string) {
    const pending = this.ensuredBuckets.get(bucket);

    if (pending) {
      return pending;
    }

    const task = this.ensureBucketInternal(bucket);
    this.ensuredBuckets.set(bucket, task);

    try {
      await task;
    } catch (error) {
      this.ensuredBuckets.delete(bucket);
      throw error;
    }
  }

  async putObject(input: StoragePutObjectInput) {
    await this.ensureBucket(input.bucket);

    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: input.bucket,
        ContentLength: input.contentLength,
        ContentType: input.contentType,
        Key: input.key,
        Metadata: input.metadata,
      }),
    );
  }

  async listObjects(input: StorageListObjectsInput) {
    await this.ensureBucket(input.bucket);

    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: input.bucket,
        MaxKeys: input.maxKeys,
        Prefix: input.prefix,
      }),
    );

    return (response.Contents ?? []).map((item) => ({
      etag: item.ETag ?? null,
      key: item.Key ?? "",
      lastModified: item.LastModified?.toISOString() ?? null,
      size: item.Size ?? 0,
    }));
  }

  async getObject(input: StorageGetObjectInput): Promise<StorageGetObjectOutput> {
    await this.ensureBucket(input.bucket);

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
    );

    if (!response.Body) {
      throw new Error("The requested object did not return any content.");
    }

    return {
      body: response.Body as StorageGetObjectOutput["body"],
      contentLength: response.ContentLength ?? null,
      contentType: response.ContentType ?? null,
      lastModified: response.LastModified?.toISOString() ?? null,
      metadata: response.Metadata ?? {},
    };
  }

  async createSignedReadUrl(input: StorageSignedReadUrlInput) {
    await this.ensureBucket(input.bucket);

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
      {
        expiresIn: input.expiresInSeconds ?? this.config.signedUrlTtlSeconds,
      },
    );
  }

  async deleteObject(bucket: string, key: string) {
    await this.ensureBucket(bucket);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  private async ensureBucketInternal(bucket: string) {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: bucket,
        }),
      );
      return;
    } catch (error) {
      if (!isBucketMissingError(error)) {
        throw error;
      }
    }

    try {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: bucket,
        }),
      );
    } catch (error) {
      if (!isBucketAlreadyCreatedError(error)) {
        throw error;
      }
    }
  }
}
