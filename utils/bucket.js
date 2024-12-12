import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

import { ApiError } from './ApiError.js';
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
  const { photoData, contentType } = file;

  // Ensure the photoData is a Buffer
  const buffer = Buffer.isBuffer(photoData)
    ? photoData
    : Buffer.from(photoData);

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: buffer, // Ensure the body is a valid Buffer
    ContentType: contentType,
  };

  try {
    // Use Upload for stream-like data (large files)
    const uploader = new Upload({
      client: s3,
      params: params,
    });
    const data = await uploader.done(); // Uploads the file and waits for it to complete
    return data;
  } catch (err) {
    console.error(err);
    throw new ApiError(500, err.message);
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
    throw new ApiError(500, err.message);
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
