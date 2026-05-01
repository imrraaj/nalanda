export const config = {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
    bucketName: "documents",
    rootPrefix: "documents",
    region: "us-east-1",
    forcePathStyle: true,
    signedUrlTtlSeconds: 60 * 5,

    listLimit: 25,
    maxUploadBytes: 100 * 1024 * 1024, // 100 MiB
};