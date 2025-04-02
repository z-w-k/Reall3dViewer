// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { isMobile, MobileDownloadLimitSplatCount, PcDownloadLimitSplatCount } from '../../utils/consts/GlobalConstants';
import { ModelStatus, SplatModel } from '../ModelData';
import { parseSplatToTexdata } from '../wasm/WasmParser';

const maxProcessCnt = isMobile ? 20480 : 51200;

export async function loadSplat(model: SplatModel) {
    let bytesRead = 0;

    try {
        model.status = ModelStatus.Fetching;
        const signal: AbortSignal = model.abortController.signal;
        const cache = model.opts.fetchReload ? 'reload' : 'default';
        const req = await fetch(model.opts.url, { mode: 'cors', credentials: 'omit', cache, signal });
        if (req.status != 200) {
            console.warn(`fetch error: ${req.status}`);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchFailed);
            return;
        }
        const reader = req.body.getReader();
        const contentLength = parseInt(req.headers.get('content-length') || '0');
        model.rowLength = 32;
        model.fileSize = contentLength;
        const maxVertexCount = (contentLength / model.rowLength) | 0;
        if (maxVertexCount < 1) {
            console.warn('data empty', model.opts.url);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.Invalid);
            return;
        }

        model.modelSplatCount = maxVertexCount;
        model.downloadSplatCount = 0;
        model.splatData = new Uint8Array(Math.min(model.modelSplatCount, model.opts.downloadLimitSplatCount) * 32);

        let perValue = new Uint8Array(32);
        let perByteLen: number = 0;

        while (true) {
            let { done, value } = await reader.read();
            if (done) break;

            if (perByteLen + value.byteLength < model.rowLength) {
                // 不足1点不必解析
                perValue.set(value, perByteLen);
                perByteLen += value.byteLength;

                bytesRead += value.length;
                model.downloadSize = bytesRead;
            } else {
                // 解析并设定数据
                perByteLen = await parseSplatAndSetSplatData(model, perByteLen, perValue, value);
                perByteLen && perValue.set(value.slice(value.byteLength - perByteLen), 0);
            }

            // 超过限制时终止下载
            const downloadLimitSplatCount = isMobile ? MobileDownloadLimitSplatCount : PcDownloadLimitSplatCount;
            const isSingleLimit: boolean = !model.meta?.autoCut && model.downloadSplatCount >= model.opts.downloadLimitSplatCount;
            const isCutLimit = model.meta?.autoCut && model.downloadSplatCount >= downloadLimitSplatCount;
            (isSingleLimit || isCutLimit) && model.abortController.abort();
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            console.warn('Fetch Abort', model.opts.url);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchAborted);
        } else {
            console.error(e);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchFailed);
        }
    } finally {
        model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchDone);
    }

    async function parseSplatAndSetSplatData(model: SplatModel, perByteLen: number, perValue: Uint8Array, newValue: Uint8Array): Promise<number> {
        return new Promise(async resolve => {
            let cntSplat = ((perByteLen + newValue.byteLength) / model.rowLength) | 0;
            let leave: number = (perByteLen + newValue.byteLength) % model.rowLength;
            let value: Uint8Array;
            if (perByteLen) {
                value = new Uint8Array(cntSplat * model.rowLength);
                value.set(perValue.slice(0, perByteLen), 0);
                value.set(newValue.slice(0, newValue.byteLength - leave), perByteLen);
            } else {
                value = newValue.slice(0, cntSplat * model.rowLength);
            }

            // 丢弃超出限制范围外的数据
            if (model.downloadSplatCount + cntSplat > model.opts.downloadLimitSplatCount) {
                cntSplat = model.opts.downloadLimitSplatCount - model.downloadSplatCount;
                leave = 0;
            }

            const fnParseSplat = async () => {
                if (cntSplat > maxProcessCnt) {
                    const data: Uint8Array = await parseSplatToTexdata(value, maxProcessCnt);
                    setSplatData(model, data);
                    model.downloadSplatCount += maxProcessCnt;
                    bytesRead += maxProcessCnt * model.rowLength;
                    model.downloadSize = bytesRead;

                    cntSplat -= maxProcessCnt;
                    value = value.slice(maxProcessCnt * model.rowLength);
                    setTimeout(fnParseSplat);
                } else {
                    const data: Uint8Array = await parseSplatToTexdata(value, cntSplat);
                    setSplatData(model, data);
                    model.downloadSplatCount += cntSplat;
                    bytesRead += cntSplat * model.rowLength;
                    model.downloadSize = bytesRead;

                    resolve(leave);
                }
            };

            await fnParseSplat();
        });
    }
}

function setSplatData(model: SplatModel, data: Uint8Array) {
    const stepCnt = 4096;
    const dataCnt = data.byteLength / 32;
    !model.splatData && (model.splatData = new Uint8Array(Math.min(model.opts.downloadLimitSplatCount, model.modelSplatCount) * 32));
    !model.watermarkData && (model.watermarkData = new Uint8Array(0));

    const f32s: Float32Array = new Float32Array(data.buffer);
    const ui32s: Uint32Array = new Uint32Array(data.buffer);
    for (let i = 0, x = 0, y = 0, z = 0, m = model.downloadSplatCount; i < dataCnt; i++) {
        x = f32s[i * 8];
        y = f32s[i * 8 + 1];
        z = f32s[i * 8 + 2];
        model.minX = Math.min(model.minX, x);
        model.maxX = Math.max(model.maxX, x);
        model.minY = Math.min(model.minY, y);
        model.maxY = Math.max(model.maxY, y);
        model.minZ = Math.min(model.minZ, z);
        model.maxZ = Math.max(model.maxZ, z);

        if (ui32s[i * 8 + 3] >> 16) {
            if (model.watermarkCount * 32 === model.watermarkData.byteLength) {
                const watermarkData = new Uint8Array((model.watermarkCount + stepCnt) * 32);
                watermarkData.set(model.watermarkData, 0);
                model.watermarkData = watermarkData;
            }
            model.watermarkData.set(data.slice(i * 32, i * 32 + 32), model.watermarkCount++ * 32);
        } else {
            model.splatData.set(data.slice(i * 32, i * 32 + 32), model.dataSplatCount++ * 32);
        }
    }
    const topY = model.header?.TopY || 0;
    model.currentRadius = Math.sqrt(model.maxX * model.maxX + topY * topY + model.maxZ * model.maxZ);
}
