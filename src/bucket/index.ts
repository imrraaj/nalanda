import { documentStorageConfig } from "@/bucket/config";
import { S3StorageDriver } from "@/bucket/s3-storage";
import type { ObjectStorageDriver, StoredDocument, UploadDocumentInput } from "@/bucket/types";

function sanitizeFileName(name: string) {
  const trimmed = name.trim() || "document";
  const cleaned = trimmed
    .replace(/[\\/]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9._ -]/g, "");

  return cleaned || "document";
}

export class DocumentStorage {
  constructor(
    private readonly driver: ObjectStorageDriver,
    private readonly config = documentStorageConfig,
  ) {}

  async uploadDocument({ file, uploadedBy }: UploadDocumentInput): Promise<StoredDocument> {
    this.validateFile(file);

    const safeName = sanitizeFileName(file.name || "document");
    const key = this.buildObjectKey(uploadedBy, safeName);
    const body = new Uint8Array(await file.arrayBuffer());
    const uploadedAt = new Date().toISOString();

    await this.driver.putObject({
      body,
      bucket: this.config.bucketName,
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
      bucket: this.config.bucketName,
      contentType: file.type || "application/octet-stream",
      key,
      name: safeName,
      size: file.size,
      uploadedAt,
      uploadedBy,
    };
  }

  async listDocuments(options?: { limit?: number; uploadedBy?: string }) {
    const limit = Math.max(
      1,
      Math.min(options?.limit ?? this.config.listLimit, this.config.listLimit),
    );
    const prefix = options?.uploadedBy
      ? this.getUserPrefix(options.uploadedBy)
      : `${this.config.rootPrefix}/`;
    const objects = await this.driver.listObjects({
      bucket: this.config.bucketName,
      maxKeys: options?.uploadedBy ? limit : limit * 10,
      prefix,
    });

    return objects
      .filter((object) => object.key.startsWith(`${this.config.rootPrefix}/`))
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

    return this.driver.createSignedReadUrl({
      bucket: this.config.bucketName,
      expiresInSeconds: this.config.signedUrlTtlSeconds,
      key,
    });
  }

  async deleteDocument(key: string) {
    this.assertManagedKey(key);

    await this.driver.deleteObject(this.config.bucketName, key);
  }

  private buildObjectKey(uploadedBy: string, safeName: string) {
    return `${this.getUserPrefix(uploadedBy)}${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  }

  private getUserPrefix(uploadedBy: string) {
    return `${this.config.rootPrefix}/${uploadedBy}/`;
  }

  private mapStoredDocument(object: { key: string; lastModified: string | null; size: number }) {
    const parts = object.key.split("/");
    const fileName = parts.at(-1) ?? object.key;
    const uploadedBy = parts.length >= 3 ? parts[1] ?? null : null;

    return {
      bucket: this.config.bucketName,
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

    if (file.size > this.config.maxUploadBytes) {
      const megabytes = Math.round(this.config.maxUploadBytes / (1024 * 1024));
      throw new Error(`Document exceeds the ${megabytes}MB upload limit.`);
    }
  }

  private assertManagedKey(key: string) {
    if (!key.startsWith(`${this.config.rootPrefix}/`)) {
      throw new Error("Requested object is outside the managed document storage path.");
    }
  }
}

const storageDriver = new S3StorageDriver(documentStorageConfig);

export const documentStorage = new DocumentStorage(storageDriver, documentStorageConfig);
export type { StoredDocument } from "@/bucket/types";
