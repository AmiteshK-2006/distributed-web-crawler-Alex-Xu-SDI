const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minio_admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minio_secret'
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'html-payloads';

async function saveContent(contentHash, htmlContent) {
    try {
        const buffer = Buffer.from(htmlContent, 'utf8');
        await minioClient.putObject(BUCKET_NAME, contentHash, buffer);
        return true;
    } catch (err) {
        console.error('MinIO Upload Error:', err);
        return false;
    }
}

module.exports = { minioClient, saveContent, BUCKET_NAME };