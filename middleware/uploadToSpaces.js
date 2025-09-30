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

const uploadFile = async (file) => {
    const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
    const fileKey = `uploads/${uniqueFileName}`;

    const params = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: fileKey,
        Body: file.buffer,
        ACL: "public-read",
        ContentType: file.mimetype,
    };
    
    await s3Client.send(new PutObjectCommand(params));
    return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${fileKey}`;
};

const uploadToSpaces = async (req, res, next) => {
    if (!req.file && !req.files) return next();

    try {
        if (req.file) {
            const fileUrl = await uploadFile(req.file);
            req.file.location = fileUrl; 
        }

        if (req.files) {
            for (const field in req.files) {
                for (const file of req.files[field]) {
                    const fileUrl = await uploadFile(file);
                    file.location = fileUrl; 
                }
            }
        }
        next();
    } catch (error) {
        console.error("❌ Cloud Upload Error:", error);
        return res.status(500).json({ message: 'Failed to upload file to cloud.' });
    }
};

module.exports = uploadToSpaces;