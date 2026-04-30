function readNumber(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const documentStorageConfig = {
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "user",
  bucketName: process.env.S3_DOCUMENT_BUCKET ?? "documents",
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  listLimit: readNumber("S3_DOCUMENT_LIST_LIMIT", 25),
  maxUploadBytes: readNumber("MAX_DOCUMENT_UPLOAD_BYTES", 100 * 1024 * 1024),
  region: process.env.S3_REGION ?? "us-east-1",
  rootPrefix: process.env.S3_DOCUMENT_PREFIX ?? "documents",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "password",
  signedUrlTtlSeconds: readNumber("S3_SIGNED_URL_TTL_SECONDS", 60 * 5),
};

export type DocumentStorageConfig = typeof documentStorageConfig;
