const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: process.env.S3_ENDPOINT || 'localhost',
    port: parseInt(process.env.S3_PORT) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const BUCKET_NAME = 'crawler-content';

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