export async function uploadPhotoToStorage(
  file: File,
  path: string
): Promise<string> {
  const publicUrl = process.env.STORAGE_PUBLIC_URL ?? 'https://storage.example.com';
  // If S3/R2 upload is needed, implement using fetch or @aws-sdk/client-s3 with STORAGE_* env vars.
  return `${publicUrl.replace(/\/$/, '')}/${path}`;
}
