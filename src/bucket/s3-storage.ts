import { Readable } from "node:stream";

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

import { config } from "@/config";

export type StoredDocument = {
  bucket: string;
  contentType: string;
  key: string;
  name: string;
  size: number;
  status?: string;
  uploadedAt: string | null;
  uploadedBy: string | null;
};

export type UploadDocumentInput = {
  file: File;
  nameOverride?: string;
  uploadedBy: string;
};

type S3ObjectBody =
  | Blob
  | NodeJS.ReadableStream
  | ReadableStream<Uint8Array>
  | Uint8Array;

type S3ObjectSummary = {
  etag: string | null;
  key: string;
  lastModified: string | null;
  size: number;
};

type S3ObjectResponse = {
  body: S3ObjectBody;
  contentLength: number | null;
  contentType: string | null;
  lastModified: string | null;
  metadata: Record<string, string>;
};

function requireConfigValue(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required S3 configuration: ${name}`);
  }

  return value;
}

function sanitizeFileName(name: string) {
  const trimmed = name.trim() || "document";
  const cleaned = trimmed
    .replace(/[\\/]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9._ -]/g, "");

  return cleaned || "document";
}

function inferContentTypeFromName(name: string) {
  const normalizedName = name.toLowerCase();

  if (normalizedName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (normalizedName.endsWith(".jpeg") || normalizedName.endsWith(".jpg")) {
    return "image/jpeg";
  }

  if (normalizedName.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedName.endsWith(".epub")) {
    return "application/epub+zip";
  }

  return "application/octet-stream";
}

function toWebStream(body: S3ObjectBody) {
  if (body instanceof ReadableStream) {
    return body;
  }

  if (body instanceof Blob) {
    return body.stream();
  }

  if (body instanceof Uint8Array) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    });
  }

  return Readable.toWeb(body as Readable) as unknown as ReadableStream<Uint8Array>;
}

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

class S3Storage {
  private readonly client: S3Client;
  private readonly ensuredBuckets = new Map<string, Promise<void>>();

  constructor() {
    this.client = new S3Client({
      credentials: {
        accessKeyId: requireConfigValue("S3_ACCESS_KEY_ID", config.accessKeyId),
        secretAccessKey: requireConfigValue("S3_SECRET_ACCESS_KEY", config.secretAccessKey),
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      region: config.region,
    });
  }

  async uploadDocument({
    file,
    nameOverride,
    uploadedBy,
  }: UploadDocumentInput): Promise<StoredDocument> {
    this.validateFile(file);

    const safeName = sanitizeFileName(nameOverride || file.name || "document");
    const key = this.buildObjectKey(uploadedBy, safeName);
    const body = new Uint8Array(await file.arrayBuffer());
    const uploadedAt = new Date().toISOString();

    await this.putObject({
      body,
      bucket: config.bucketName,
      contentLength: file.size,
      contentType: file.type || "application/octet-stream",
      key,
      metadata: {
        "original-name": safeName,
        "uploaded-at": uploadedAt,
        "uploaded-by": uploadedBy,
      },
    });

    return {
      bucket: config.bucketName,
      contentType: file.type || "application/octet-stream",
      key,
      name: safeName,
      size: file.size,
      uploadedAt,
      uploadedBy,
    };
  }

  async listDocuments(options: { limit: number; uploadedBy: string }) {
    const limit = Math.max(1, Math.min(options.limit, config.listLimit));
    const prefix = options.uploadedBy
      ? this.getUserPrefix(options.uploadedBy)
      : `${config.rootPrefix}/`;
    const objects = await this.listObjects({
      bucket: config.bucketName,
      maxKeys: options.uploadedBy ? limit : limit * 10,
      prefix,
    });

    return objects
      .filter((object) => object.key.startsWith(`${config.rootPrefix}/`))
      .sort((left, right) => {
        const leftTime = left.lastModified ? new Date(left.lastModified).getTime() : 0;
        const rightTime = right.lastModified ? new Date(right.lastModified).getTime() : 0;

        return rightTime - leftTime;
      })
      .slice(0, limit)
      .map((object) => this.mapStoredDocument(object));
  }

  async getSignedReadUrl(key: string) {
    this.assertManagedKey(key);

    return this.createSignedReadUrl({
      bucket: config.bucketName,
      expiresInSeconds: config.signedUrlTtlSeconds,
      key,
    });
  }

  async getDocumentContent(key: string) {
    this.assertManagedKey(key);

    const object = await this.getObject({
      bucket: config.bucketName,
      key,
    });
    const fileName = object.metadata["original-name"] ?? this.getDisplayName(key.split("/").at(-1) ?? key);

    return {
      body: toWebStream(object.body),
      contentLength: object.contentLength,
      contentType: object.contentType ?? inferContentTypeFromName(fileName),
      key,
      name: fileName,
      uploadedAt: object.lastModified,
      uploadedBy: object.metadata["uploaded-by"] ?? this.getUploadedByFromKey(key),
    };
  }

  async deleteDocument(key: string) {
    this.assertManagedKey(key);

    await this.deleteObject(config.bucketName, key);
  }

  private async ensureBucket(bucket: string) {
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

  private async putObject(input: {
    body: Blob | Buffer | ReadableStream | Uint8Array | string;
    bucket: string;
    contentLength?: number;
    contentType?: string;
    key: string;
    metadata?: Record<string, string>;
  }) {
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

  private async listObjects(input: {
    bucket: string;
    maxKeys?: number;
    prefix?: string;
  }): Promise<S3ObjectSummary[]> {
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

  private async getObject(input: {
    bucket: string;
    key: string;
  }): Promise<S3ObjectResponse> {
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
      body: response.Body as S3ObjectBody,
      contentLength: response.ContentLength ?? null,
      contentType: response.ContentType ?? null,
      lastModified: response.LastModified?.toISOString() ?? null,
      metadata: response.Metadata ?? {},
    };
  }

  private async createSignedReadUrl(input: {
    bucket: string;
    expiresInSeconds?: number;
    key: string;
  }) {
    await this.ensureBucket(input.bucket);

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
      {
        expiresIn: input.expiresInSeconds ?? config.signedUrlTtlSeconds,
      },
    );
  }

  private async deleteObject(bucket: string, key: string) {
    await this.ensureBucket(bucket);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  private buildObjectKey(uploadedBy: string, safeName: string) {
    return `${this.getUserPrefix(uploadedBy)}${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  }

  private getUserPrefix(uploadedBy: string) {
    return `${config.rootPrefix}/${uploadedBy}/`;
  }

  private getUploadedByFromKey(key: string) {
    const parts = key.split("/");

    return parts.length >= 3 ? parts[1] ?? null : null;
  }

  private mapStoredDocument(object: { key: string; lastModified: string | null; size: number }) {
    const parts = object.key.split("/");
    const fileName = parts.at(-1) ?? object.key;
    const uploadedBy = this.getUploadedByFromKey(object.key);

    return {
      bucket: config.bucketName,
      contentType: "application/octet-stream",
      key: object.key,
      name: this.getDisplayName(fileName),
      size: object.size,
      uploadedAt: object.lastModified,
      uploadedBy,
    };
  }

  private getDisplayName(fileName: string) {
    return fileName.replace(/^\d+-[0-9a-f-]+-/, "");
  }

  private validateFile(file: File) {
    if (file.size === 0) {
      throw new Error("Cannot upload an empty document.");
    }

    if (file.size > config.maxUploadBytes) {
      const megabytes = Math.round(config.maxUploadBytes / (1024 * 1024));
      throw new Error(`Document exceeds the ${megabytes}MB upload limit.`);
    }

    const supportedTypes = new Set([
      "application/epub+zip",
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ]);
    const normalizedName = file.name.toLowerCase();
    const hasSupportedExtension = [
      ".epub",
      ".jpeg",
      ".jpg",
      ".pdf",
      ".png",
    ].some((extension) => normalizedName.endsWith(extension));

    if (file.type && supportedTypes.has(file.type.toLowerCase())) {
      return;
    }

    if (hasSupportedExtension) {
      return;
    }

    throw new Error("Only PDF, JPEG, PNG, and EPUB files are supported.");
  }

  private assertManagedKey(key: string) {
    if (!key.startsWith(`${config.rootPrefix}/`)) {
      throw new Error("Requested object is outside the managed document storage path.");
    }
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

export const documentStorage = new S3Storage();
