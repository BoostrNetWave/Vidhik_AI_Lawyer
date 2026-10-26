import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let gridFSBucket: mongoose.mongo.GridFSBucket | null = null;

export const getGridFSBucket = (): mongoose.mongo.GridFSBucket | null => {
    if (!gridFSBucket && mongoose.connection.readyState === 1 && mongoose.connection.db) {
        gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });
        console.log('[GridFS] Bucket initialized successfully on shared MongoDB (Lawyer Backend)');
    }
    return gridFSBucket;
};

export const getMimeType = (filename: string): string => {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.svg':
            return 'image/svg+xml';
        case '.pdf':
            return 'application/pdf';
        case '.doc':
            return 'application/msword';
        case '.docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.txt':
            return 'text/plain';
        case '.mp4':
            return 'video/mp4';
        case '.webm':
            return 'video/webm';
        default:
            return 'application/octet-stream';
    }
};

/**
 * Save a file to MongoDB GridFS.
 * Ensures the file is stored in central database accessible by both user and lawyer servers.
 */
export const saveFileToGridFS = async (
    filename: string,
    localFilePath: string,
    mimetype?: string
): Promise<boolean> => {
    try {
        const bucket = getGridFSBucket();
        if (!bucket) {
            console.warn('[GridFS] Bucket not ready, skipping GridFS save for:', filename);
            return false;
        }

        if (!fs.existsSync(localFilePath)) {
            console.warn('[GridFS] Local file not found for upload to GridFS:', localFilePath);
            return false;
        }

        // Check if file already exists in GridFS; if so, delete old copy to replace
        try {
            const existing = await bucket.find({ filename }).toArray();
            for (const item of existing) {
                await bucket.delete(item._id).catch(() => {});
            }
        } catch (cleanupErr) {
            // Non-fatal
        }

        const determinedMime = mimetype || getMimeType(filename);

        return new Promise((resolve) => {
            const readStream = fs.createReadStream(localFilePath);
            const uploadStream = bucket.openUploadStream(filename, {
                contentType: determinedMime,
                metadata: {
                    uploadedAt: new Date(),
                    originalPath: localFilePath
                }
            });

            uploadStream.on('finish', () => {
                console.log(`[GridFS] Stored file in central MongoDB: ${filename} (${determinedMime})`);
                resolve(true);
            });

            uploadStream.on('error', (err) => {
                console.error(`[GridFS] Error uploading ${filename}:`, err);
                resolve(false);
            });

            readStream.pipe(uploadStream);
        });
    } catch (error) {
        console.error('[GridFS] Exception in saveFileToGridFS:', error);
        return false;
    }
};

/**
 * Retrieve a file stream and metadata from GridFS by filename.
 * Supports both raw and URL-decoded/encoded filename variants.
 */
export const getFileFromGridFS = async (filename: string) => {
    try {
        const bucket = getGridFSBucket();
        if (!bucket) return null;

        let queryName = filename;
        let files = await bucket.find({ filename: queryName }).toArray();

        // If not found, try decoded variant if encoded
        if ((!files || files.length === 0) && queryName.includes('%')) {
            try {
                const decoded = decodeURIComponent(queryName);
                const decodedFiles = await bucket.find({ filename: decoded }).toArray();
                if (decodedFiles && decodedFiles.length > 0) {
                    queryName = decoded;
                    files = decodedFiles;
                }
            } catch {}
        }

        // If still not found, try encoded variant
        if (!files || files.length === 0) {
            try {
                const encoded = encodeURIComponent(queryName);
                if (encoded !== queryName) {
                    const encodedFiles = await bucket.find({ filename: encoded }).toArray();
                    if (encodedFiles && encodedFiles.length > 0) {
                        queryName = encoded;
                        files = encodedFiles;
                    }
                }
            } catch {}
        }

        if (!files || files.length === 0) {
            return null;
        }

        const fileDoc = files[0];
        const stream = bucket.openDownloadStreamByName(queryName);
        return { fileDoc, stream };
    } catch (error) {
        console.error('[GridFS] Error retrieving file:', filename, error);
        return null;
    }
};

/**
 * Synchronize all local files in uploads folder to MongoDB GridFS on server startup.
 * Ensures existing local files are accessible to the other server immediately.
 */
export const syncLocalUploadsToGridFS = async (uploadsDir: string) => {
    try {
        if (!fs.existsSync(uploadsDir)) return;
        const bucket = getGridFSBucket();
        if (!bucket) return;

        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                const existing = await bucket.find({ filename: file }).toArray();
                if (!existing || existing.length === 0) {
                    console.log(`[GridFS Sync] Migrating existing local file to GridFS: ${file}`);
                    await saveFileToGridFS(file, filePath);
                }
            }
        }
    } catch (error) {
        console.error('[GridFS Sync] Error syncing local uploads to GridFS:', error);
    }
};
