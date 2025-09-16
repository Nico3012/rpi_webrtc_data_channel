const CHUNK_SIZE = 64 * 1024; // 64KB per chunk

/**
 * Convert Uint8Array to binary string
 * @param {Uint8Array} uint8Array
 * @returns {string}
 */
const arrayBufferToBase64 = (uint8Array) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const sub = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, sub);
    }
    return btoa(binary);
}

/**
 * @param {string} str
 */
const parseJSONSafe = (str) => {
    try {
        return JSON.parse(str);
    } catch {
        return undefined;
    }
};

/**
 * @param {import('./data-channel-mux.js').Channel} channel
 * @param {string} fetchPath
 */
export const uploadFile = async (channel, fetchPath, filename) => {
    const response = await fetch(fetchPath);

    const arrayBuffer = await response.arrayBuffer();
    const totalSize = arrayBuffer.byteLength;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

    // initial message for metadata
    channel.sendData(JSON.stringify({
        type: 'file-init',
        filename: filename,
        totalChunks: totalChunks,
        totalSize: totalSize,
    }));

    const uint8 = new Uint8Array(arrayBuffer);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const slice = uint8.subarray(start, end);

        // Convert to base64
        const chunkBase64 = arrayBufferToBase64(slice);

        channel.sendData(JSON.stringify({
            type: 'file-chunk',
            index: i,
            totalChunks: totalChunks,
            data: chunkBase64,
        }));

        // await file-ack message to ensure, we dont overload the datachannel
        await new Promise(resolve => {
            const controller = new AbortController();
            channel.addEventListener('message-received', (event) => {
                // parseJSONSafe returns undefined, if parsing fails
                const data = parseJSONSafe(event.detail.message);
                if (data !== null && typeof data === 'object' && data.type === 'file-ack' && data.index === i) {
                    controller.abort();
                    resolve();
                }
            }, { signal: controller.signal });
        });
    }
};
