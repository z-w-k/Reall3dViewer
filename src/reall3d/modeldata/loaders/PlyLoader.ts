// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { clipUint8, encodeSplatSH } from '../../utils/CommonUtils';
import {
    DataSize32,
    isMobile,
    MobileDownloadLimitSplatCount,
    PcDownloadLimitSplatCount,
    SH_C0,
    SpxBlockFormatSH1,
    SpxBlockFormatSH2,
    SpxBlockFormatSH3,
} from '../../utils/consts/GlobalConstants';
import { ModelStatus, SplatModel } from '../ModelData';
import { parseSplatToTexdata, parseSpxBlockData } from '../wasm/WasmParser';

const maxProcessCnt = isMobile ? 20480 : 51200;

export async function loadPly(model: SplatModel) {
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
        model.fileSize = contentLength;
        model.downloadSize = 0;
        model.downloadSplatCount = 0;

        let perValue = new Uint8Array(256);
        let perByteLen: number = 0;

        let headChunks: Uint8Array[] = [];
        let header: any;

        while (true) {
            let { done, value } = await reader.read();
            if (done) break;

            model.downloadSize += value.byteLength;
            if (headChunks) {
                headChunks.push(value);
                if (model.downloadSize < 200) {
                    continue;
                }

                const headData = new Uint8Array(model.downloadSize);
                for (let i = 0, offset = 0; i < headChunks.length; i++) {
                    headData.set(headChunks[i], offset);
                    offset += headChunks[i].byteLength;
                }

                header = parseHeader(headData);
                if (!header) {
                    headChunks = [headData];
                    continue;
                }
                headChunks = null;
                value = headData.slice(header.headerLength);
                model.rowLength = header.rowLength;
                model.dataShDegree = header.shDegree;
                model.splatData = new Uint8Array(Math.min(header.vertexCount, model.opts.downloadLimitSplatCount) * 32);
                model.modelSplatCount = header.vertexCount;
            }

            if (perByteLen + value.byteLength < model.rowLength) {
                // 不足1点不必解析
                perValue.set(value, perByteLen);
                perByteLen += value.byteLength;
            } else {
                // 解析并设定数据
                perByteLen = await parsePlyAndSetSplatData(header, model, perByteLen, perValue, value);
                perByteLen && perValue.set(value.slice(value.byteLength - perByteLen), 0);
            }

            // 超过限制时终止下载
            const pcDownloadLimitCount = model.meta.maxRenderCountOfPc || PcDownloadLimitSplatCount;
            const mobileDownloadLimitCount = model.meta.maxRenderCountOfMobile || MobileDownloadLimitSplatCount;
            const downloadLimitSplatCount = isMobile ? mobileDownloadLimitCount : pcDownloadLimitCount;
            const isSingleLimit: boolean = !model.meta?.autoCut && model.downloadSplatCount >= model.opts.downloadLimitSplatCount;
            const isCutLimit = model.meta?.autoCut && model.downloadSplatCount >= downloadLimitSplatCount;
            (isSingleLimit || isCutLimit) && model.abortController.abort();
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            console.log('Fetch Abort', model.opts.url);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchAborted);
        } else {
            console.error(e);
            model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchFailed);
        }
    } finally {
        model.status === ModelStatus.Fetching && (model.status = ModelStatus.FetchDone);
    }

    async function parsePlyAndSetSplatData(
        header: any,
        model: SplatModel,
        perByteLen: number,
        perValue: Uint8Array,
        newValue: Uint8Array,
    ): Promise<number> {
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

            const fnParsePly = async () => {
                if (cntSplat > maxProcessCnt) {
                    const data: Uint8Array = await parsePlyToTexdata(header, value, maxProcessCnt);
                    setSplatData(model, data);
                    model.downloadSplatCount += maxProcessCnt;
                    cntSplat -= maxProcessCnt;
                    value = value.slice(maxProcessCnt * model.rowLength);
                    setTimeout(fnParsePly);
                } else {
                    const data: Uint8Array = await parsePlyToTexdata(header, value, cntSplat);
                    setSplatData(model, data);
                    model.downloadSplatCount += cntSplat;
                    resolve(leave);
                }
            };

            await fnParsePly();
        });
    }

    async function parsePlyToTexdata(header: any, value: Uint8Array, cntSplat: number): Promise<Uint8Array> {
        const splatData = new Uint8Array(cntSplat * DataSize32);
        const f32sValue = new Float32Array(value.buffer);
        const f32sData = new Float32Array(splatData.buffer);

        for (let i = 0; i < cntSplat; i++) {
            f32sData[i * 8 + 0] = f32sValue[(i * model.rowLength + header.offsets['x']) / 4];
            f32sData[i * 8 + 1] = f32sValue[(i * model.rowLength + header.offsets['y']) / 4];
            f32sData[i * 8 + 2] = f32sValue[(i * model.rowLength + header.offsets['z']) / 4];
            f32sData[i * 8 + 3] = Math.exp(f32sValue[(i * model.rowLength + header.offsets['scale_0']) / 4]);
            f32sData[i * 8 + 4] = Math.exp(f32sValue[(i * model.rowLength + header.offsets['scale_1']) / 4]);
            f32sData[i * 8 + 5] = Math.exp(f32sValue[(i * model.rowLength + header.offsets['scale_2']) / 4]);
            splatData[i * 32 + 24] = clipUint8((0.5 + SH_C0 * f32sValue[(i * model.rowLength + header.offsets['f_dc_0']) / 4]) * 255);
            splatData[i * 32 + 25] = clipUint8((0.5 + SH_C0 * f32sValue[(i * model.rowLength + header.offsets['f_dc_1']) / 4]) * 255);
            splatData[i * 32 + 26] = clipUint8((0.5 + SH_C0 * f32sValue[(i * model.rowLength + header.offsets['f_dc_2']) / 4]) * 255);
            splatData[i * 32 + 27] = clipUint8((1.0 / (1.0 + Math.exp(-f32sValue[(i * model.rowLength + header.offsets['opacity']) / 4]))) * 255);
            splatData[i * 32 + 28] = clipUint8(f32sValue[(i * model.rowLength + header.offsets['rot_0']) / 4] * 128.0 + 128.0);
            splatData[i * 32 + 29] = clipUint8(f32sValue[(i * model.rowLength + header.offsets['rot_1']) / 4] * 128.0 + 128.0);
            splatData[i * 32 + 30] = clipUint8(f32sValue[(i * model.rowLength + header.offsets['rot_2']) / 4] * 128.0 + 128.0);
            splatData[i * 32 + 31] = clipUint8(f32sValue[(i * model.rowLength + header.offsets['rot_3']) / 4] * 128.0 + 128.0);
        }

        if (header.shDegree == 3) {
            const shDim = 15;
            const sh2 = new Uint8Array(cntSplat * 24 + 8);
            const sh3 = new Uint8Array(cntSplat * 21 + 8);
            const u2s = new Uint32Array(2);
            u2s[0] = cntSplat;
            u2s[1] = SpxBlockFormatSH2;
            sh2.set(new Uint8Array(u2s.buffer), 0);
            const u3s = new Uint32Array(2);
            u3s[0] = cntSplat;
            u3s[1] = SpxBlockFormatSH3;
            sh3.set(new Uint8Array(u3s.buffer), 0);

            for (let i = 0, n = 0; i < cntSplat; i++) {
                for (let j = 0; j < 8; j++) {
                    for (let c = 0; c < 3; c++) {
                        sh2[8 + n++] = encodeSplatSH(f32sValue[(i * model.rowLength + header.offsets['f_rest_' + (j + c * shDim)]) / 4]);
                    }
                }
            }
            for (let i = 0, n = 0; i < cntSplat; i++) {
                for (let j = 8; j < shDim; j++) {
                    for (let c = 0; c < 3; c++) {
                        sh3[8 + n++] = encodeSplatSH(f32sValue[(i * model.rowLength + header.offsets['f_rest_' + (j + c * shDim)]) / 4]);
                    }
                }
            }
            const sh2Block = await parseSpxBlockData(sh2);
            model.Sh12Data.push(sh2Block.datas);
            const sh3Block = await parseSpxBlockData(sh3);
            model.Sh3Data.push(sh3Block.datas);
        } else if (header.shDegree == 2) {
            const shDim = 8;
            const sh2 = new Uint8Array(cntSplat * 24 + 8);
            const u2s = new Uint32Array(2);
            u2s[0] = cntSplat;
            u2s[1] = SpxBlockFormatSH2;
            sh2.set(new Uint8Array(u2s.buffer), 0);

            for (let i = 0, n = 0; i < cntSplat; i++) {
                for (let j = 0; j < shDim; j++) {
                    for (let c = 0; c < 3; c++) {
                        sh2[8 + n++] = encodeSplatSH(f32sValue[(i * model.rowLength + header.offsets['f_rest_' + (j + c * shDim)]) / 4]);
                    }
                }
            }
            const sh2Block = await parseSpxBlockData(sh2);
            model.Sh12Data.push(sh2Block.datas);
        } else if (header.shDegree == 1) {
            const shDim = 3;
            const sh2 = new Uint8Array(cntSplat * 9 + 8);
            const u2s = new Uint32Array(2);
            u2s[0] = cntSplat;
            u2s[1] = SpxBlockFormatSH1;
            sh2.set(new Uint8Array(u2s.buffer), 0);

            for (let i = 0, n = 0; i < cntSplat; i++) {
                for (let j = 0; j < shDim; j++) {
                    for (let c = 0; c < 3; c++) {
                        sh2[8 + n++] = encodeSplatSH(f32sValue[(i * model.rowLength + header.offsets['f_rest_' + (j + c * shDim)]) / 4]);
                    }
                }
            }
            const sh2Block = await parseSpxBlockData(sh2);
            model.Sh12Data.push(sh2Block.datas);
        }

        return await parseSplatToTexdata(splatData, cntSplat);
    }

    function parseHeader(ui8s: Uint8Array): any {
        let header = new TextDecoder().decode(ui8s.slice(0, 1024 * 2));
        const header_end = 'end_header\n';
        const header_end_index = header.indexOf(header_end);
        if (header_end_index < 0) {
            if (ui8s.byteLength > 1024 * 2) throw new Error('Unable to read .ply file header');
            return null;
        }

        if (!header.startsWith('ply') || header.indexOf('format binary_little_endian 1.0') < 0) {
            throw new Error('Unknow .ply file header');
        }

        const vertexCount = parseInt(/element vertex (\d+)\n/.exec(header)[1]);
        let row_offset = 0,
            offsets = {},
            types = {};
        const TYPE_MAP = {
            double: 'getFloat64',
            int: 'getInt32',
            uint: 'getUint32',
            float: 'getFloat32',
            short: 'getInt16',
            ushort: 'getUint16',
            uchar: 'getUint8',
        };
        for (let prop of header
            .slice(0, header_end_index)
            .split('\n')
            .filter(k => k.startsWith('property '))) {
            const [p, type, name] = prop.split(' ');
            const arrayType = TYPE_MAP[type] || 'getInt8';
            types[name] = arrayType;
            offsets[name] = row_offset;
            row_offset += parseInt(arrayType.replace(/[^\d]/g, '')) / 8;
        }

        let shDegree = 0;
        if (types['f_rest_44']) {
            shDegree = 3;
        } else if (types['f_rest_23']) {
            shDegree = 2;
        } else if (types['f_rest_8']) {
            shDegree = 1;
        }

        const props = ['x', 'y', 'z', 'scale_0', 'scale_1', 'scale_2', 'f_dc_0', 'f_dc_1', 'f_dc_2', 'opacity', 'rot_0', 'rot_1', 'rot_2', 'rot_3'];
        for (let i = 0; i < props.length; i++) {
            const prop = props[i];
            if (!types[prop]) {
                throw new Error(`Property not found: ${prop}`);
            }
        }
        return { headerLength: header_end_index + header_end.length, offsets, rowLength: row_offset, vertexCount, shDegree };
    }
}

function setSplatData(model: SplatModel, data: Uint8Array) {
    const stepCnt = 4096;
    const dataCnt = data.byteLength / 32;
    !model.splatData && (model.splatData = new Uint8Array(Math.min(model.opts.downloadLimitSplatCount, model.modelSplatCount) * 32));
    !model.watermarkData && (model.watermarkData = new Uint8Array(0));

    const f32s: Float32Array = new Float32Array(data.buffer);
    const ui32s: Uint32Array = new Uint32Array(data.buffer);
    for (let i = 0, x = 0, y = 0, z = 0; i < dataCnt; i++) {
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
    const topY = 0;
    model.currentRadius = Math.sqrt(model.maxX * model.maxX + topY * topY + model.maxZ * model.maxZ);
}
