import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  signedGetUrl(key: string, expiresSeconds?: number): Promise<string>;
}

class LocalStorage implements StorageAdapter {
  private dir: string;
  constructor(dir: string) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }
  private full(key: string): string {
    const safe = key.replace(/\.\./g, "");
    return path.join(this.dir, safe);
  }
  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const full = this.full(key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, body);
  }
  async get(key: string): Promise<Buffer> {
    return fs.promises.readFile(this.full(key));
  }
  async signedGetUrl(key: string): Promise<string> {
    // Dev only — production must use S3 signed URLs.
    return `/api/v1/uploads/local/${encodeURIComponent(key)}`;
  }
}

class S3Storage implements StorageAdapter {
  private client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION === "auto" ? "us-east-1" : env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType })
    );
  }
  async get(key: string): Promise<Buffer> {
    const out = await this.client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    const chunks: Buffer[] = [];
    const stream = out.Body as unknown as AsyncIterable<Uint8Array>;
    for await (const c of stream) chunks.push(Buffer.from(c));
    return Buffer.concat(chunks);
  }
  async signedGetUrl(key: string, expiresSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn: expiresSeconds }
    );
  }
}

let singleton: StorageAdapter | null = null;

/** Storage factory: local (dev) or S3-compatible (R2/prod). Separate namespaces for books vs learner uploads. */
export function storage(): StorageAdapter {
  if (singleton) return singleton;
  if (env.STORAGE_PROVIDER === "s3") {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID) {
      logger.warn("S3 selected but credentials incomplete — falling back to local storage");
      singleton = new LocalStorage(env.STORAGE_LOCAL_DIR);
    } else {
      singleton = new S3Storage();
    }
  } else {
    singleton = new LocalStorage(env.STORAGE_LOCAL_DIR);
  }
  return singleton;
}

export const BOOK_NAMESPACE = "official-books";
export const LEARNER_NAMESPACE = "learner-uploads";
