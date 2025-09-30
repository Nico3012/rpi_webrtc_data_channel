const CHUNK_SIZE = 64 * 1024;

const arrayBufferToBase64 = (uint8Array) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const sub = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, sub);
    }
    return btoa(binary);
};

const parseJSONSafe = (str) => {
    try {
        return JSON.parse(str);
    } catch {
        return undefined;
    }
};

const waitFor = (channel, filename, match) => new Promise((resolve, reject) => {
    const controller = new AbortController();
    channel.addEventListener('message-received', (event) => {
        const data = parseJSONSafe(event.detail.message);
        if (!data || data.filename !== filename) {
            return;
        }
        if (data.type === 'file-error') {
            controller.abort();
            reject(new Error(data.reason || 'file transfer failed'));
            return;
        }
        if (match(data)) {
            controller.abort();
            resolve(data);
        }
    }, { signal: controller.signal });
});

const send = (channel, payload) => channel.sendData(JSON.stringify(payload));

export async function* uploadFile(channel, fetchPath, filename) {
    const response = await fetch(fetchPath);
    if (!response.ok) {
        throw new Error(`failed to fetch ${fetchPath}: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const totalSize = buffer.byteLength;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE) || 1;
    send(channel, { type: 'file-init', filename, totalChunks, totalSize });
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < totalChunks; i++) {
        const end = Math.min((i + 1) * CHUNK_SIZE, totalSize);
        send(channel, {
            type: 'file-chunk',
            filename,
            index: i,
            totalChunks,
            data: arrayBufferToBase64(bytes.subarray(i * CHUNK_SIZE, end)),
        });
        await waitFor(channel, filename, (data) => data.type === 'file-ack' && data.index === i);
        const sentChunks = i + 1;
        yield {
            filename,
            chunk: sentChunks,
            totalChunks,
            bytesSent: end,
            totalBytes: totalSize,
            progress: sentChunks / totalChunks,
        };
    }
    const complete = await waitFor(channel, filename, (data) => data.type === 'file-complete');
    return {
        filename,
        totalChunks: complete.totalChunks ?? totalChunks,
        totalSize: complete.totalSize ?? totalSize,
    };
}
