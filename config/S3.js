const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3Client = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
});

const uploadFileToSpaces = async (file) => {
    const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
    const fileName = `uploads/${uniqueSuffix}`;

    const params = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ACL: "public-read",
        ContentType: file.mimetype,
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        const url = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${fileName}`;
        console.log("✅ File uploaded to Spaces:", url);
        return url;
    } catch (err) {
        console.error("❌ Error uploading file to Spaces:", err);
        throw err;
    }
};

module.exports = { uploadFileToSpaces };