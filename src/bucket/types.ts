export type StoredDocument = {
  bucket: string;
  contentType: string;
  key: string;
  name: string;
  size: number;
  uploadedAt: string | null;
  uploadedBy: string | null;
};

export type UploadDocumentInput = {
  file: File;
  uploadedBy: string;
};

export type StorageObjectSummary = {
  etag: string | null;
  key: string;
  lastModified: string | null;
  size: number;
};

export type StoragePutObjectInput = {
  body: Blob | Buffer | ReadableStream | Uint8Array | string;
  bucket: string;
  contentLength?: number;
  contentType?: string;
  key: string;
  metadata?: Record<string, string>;
};

export type StorageListObjectsInput = {
  bucket: string;
  maxKeys?: number;
  prefix?: string;
};

export type StorageSignedReadUrlInput = {
  bucket: string;
  expiresInSeconds?: number;
  key: string;
};

export interface ObjectStorageDriver {
  createSignedReadUrl(input: StorageSignedReadUrlInput): Promise<string>;
  deleteObject(bucket: string, key: string): Promise<void>;
  ensureBucket(bucket: string): Promise<void>;
  listObjects(input: StorageListObjectsInput): Promise<StorageObjectSummary[]>;
  putObject(input: StoragePutObjectInput): Promise<void>;
}
