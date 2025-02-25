// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { ModelStatus, SplatModel } from '../ModelData';

export async function loadFile(model: SplatModel) {
    try {
        model.status = ModelStatus.Fetching;
        const signal: AbortSignal = model.abortController.signal;
        const req = await fetch(model.url, { mode: 'cors', credentials: 'omit', cache: 'reload', signal });
        if (req.status != 200) {
            console.warn(`fetch error: ${req.status}`);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchFailed);
            return;
        }
        const reader = req.body.getReader();
        const contentLength = parseInt(req.headers.get('content-length') || '0');
        model.fileSize = contentLength;
        model.splatData = new Uint8Array(contentLength);

        let bytesRead = 0;
        while (true) {
            let { done, value } = await reader.read();
            if (done) break;
            model.splatData.set(value, bytesRead);
            bytesRead += value.length;
            model.downloadSize = bytesRead;
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            console.warn('Fetch Abort', model.url);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchAborted);
        } else {
            console.error(e.message);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchFailed);
        }
    } finally {
        model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchDone);
    }
}
