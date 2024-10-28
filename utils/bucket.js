import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const BUCKET_NAME = process.env.BUCKET_NAME;
const BUCKET_REGION = process.env.BUCKET_REGION;
const ACCESS_KEY = process.env.ACCESS_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  region: BUCKET_REGION,
});

export async function uploadFile(file, fileName) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.photoData,
    ContentType: file.contentType,
  };

  const command = new PutObjectCommand(params);

  try {
    const data = await s3.send(command);
    return data;
  } catch (err) {
    console.error('Error uploading file', err);
    throw err;
  }
}

export async function deleteFile(fileName) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
  };

  try {
    const data = await s3.send(new DeleteObjectCommand(params));
    return data;
  } catch (err) {
    console.error('Error deleting file', err);
    throw err;
  }
}

export async function getFile(fileName) {
  const getObjectParams = {
    Bucket: BUCKET_NAME,
    Key: fileName,
  };
  const command = new GetObjectCommand(getObjectParams);
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return url;
}
