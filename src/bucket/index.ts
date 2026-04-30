import { S3Client, ListBucketsCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    endpoint: 'http://localhost:9000', // Point to your MinIO instance
    region: 'us-east-1',             // Region is required by SDK but ignored by MinIO
    credentials: {
        accessKeyId: 'user',
        secretAccessKey: 'password'
    },
    forcePathStyle: true,
});
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export async function getSignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: "books",
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 5, // 5 minutes
  });

  return url;
}

// async/await.
try {
    // const create = new CreateBucketCommand({ Bucket: 'books', });
    // await s3Client.send(create);
    // const list = new ListBucketsCommand();
    // const data = await s3Client.send(list);
    // console.log("Success", data.Buckets);
    // const put = new PutObjectCommand({
    //     Bucket: 'books',
    //     Key: 'example.txt',
    //     Body: 'Hello, MinIO!',
    // })
    // const data = await s3Client.send(put);
    // console.log("File uploaded successfully", data);
    console.log(await getSignedDownloadUrl("example.txt"));
    // process data.
} catch (error) {
    // error handling.
}
