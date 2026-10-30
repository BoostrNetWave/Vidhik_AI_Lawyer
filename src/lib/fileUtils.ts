/**
 * Resolves any document/file URL safely across environments (user/lawyer servers, dev & prod).
 * Always routes through the lawyer panel's upload endpoint which serves from disk or MongoDB GridFS.
 */
export function getFileUrl(rawUrl: string | undefined | null): string {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    // If it's already an absolute or blob/data URL, return directly
    if (/^(https?:|\/\/|blob:|data:)/i.test(trimmed)) {
        return trimmed;
    }

    // Extract pure filename
    const clean = trimmed.split('?')[0].split('#')[0];
    const filename = clean.split('/').filter(Boolean).pop();
    if (!filename) return '';

    // Route directly via API proxy so it is served by Express (disk / GridFS) without touching SPA router
    return `/lawyer/api/uploads/${filename}`;
}

export async function downloadFile(url: string, filename?: string): Promise<void> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || getFileName(url);
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    } catch {
        window.open(url, '_blank');
    }
}

export function isImageFile(filenameOrUrl: string | undefined | null): boolean {
    if (!filenameOrUrl) return false;
    const clean = filenameOrUrl.split('?')[0].split('#')[0];
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(clean);
}

export function isPdfFile(filenameOrUrl: string | undefined | null): boolean {
    if (!filenameOrUrl) return false;
    const clean = filenameOrUrl.split('?')[0].split('#')[0];
    return /\.pdf$/i.test(clean);
}

export function isWordFile(filenameOrUrl: string | undefined | null): boolean {
    if (!filenameOrUrl) return false;
    const clean = filenameOrUrl.split('?')[0].split('#')[0];
    return /\.(doc|docx|dot|dotx|rtf)$/i.test(clean);
}

export function getFileName(filenameOrUrl: string | undefined | null): string {
    if (!filenameOrUrl) return 'Document';
    const clean = filenameOrUrl.split('?')[0].split('#')[0];
    const name = clean.split('/').filter(Boolean).pop() || 'Document';
    // Remove timestamp prefix if pattern matches e.g. 1729869123456-filename.pdf
    return name.replace(/^\d{10,14}-/, '');
}

export function formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
