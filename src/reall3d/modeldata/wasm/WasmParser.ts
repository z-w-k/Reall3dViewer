// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import {
    SplatDataSize32,
    SpxBlockFormats,
    SpxBlockFormatSH1,
    SpxBlockFormatSH2,
    SpxBlockFormatSH3,
    WasmBlockSize,
} from '../../utils/consts/GlobalConstants';
import { SpxHeader } from '../ModelData';

const WasmBase64 =
    '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';

export async function parseSpxHeader(header: Uint8Array): Promise<SpxHeader> {
    const ui32s = new Uint32Array(header.buffer);
    const f32s = new Float32Array(header.buffer);
    const head = new SpxHeader();
    head.Fixed = String.fromCharCode(header[0]) + String.fromCharCode(header[1]) + String.fromCharCode(header[2]);
    head.Version = header[3];
    head.SplatCount = ui32s[1];
    head.MinX = f32s[2];
    head.MaxX = f32s[3];
    head.MinY = f32s[4];
    head.MaxY = f32s[5];
    head.MinZ = f32s[6];
    head.MaxZ = f32s[7];
    head.TopY = f32s[8];
    head.MaxRadius = f32s[9];
    head.CreateDate = ui32s[10];
    head.CreaterId = ui32s[11];
    head.ExclusiveId = ui32s[12];
    head.ShDegree = header[52];
    head.Flag1 = header[53];
    head.Flag2 = header[54];
    head.Flag3 = header[55];
    head.Reserve1 = ui32s[14];
    head.Reserve2 = ui32s[15];

    let comment: string = '';
    for (let i = 64; i < 124; i++) {
        comment += String.fromCharCode(header[i]);
    }
    head.Comment = comment.trim();

    head.HashCheck = true;
    if (head.Fixed !== 'spx' && head.Version !== 1) {
        return null;
    }

    // 哈希校验
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const headerParser: any = instance.exports.H;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(header, 0);
    const code: number = headerParser(0);
    if (code) {
        head.HashCheck = false;
    }

    return head;
}

interface SpxBlockResult {
    splatCount: number;
    blockFormat: number;
    datas?: Uint8Array;
    isSplat?: boolean;
    isSh?: boolean;
    isSh1?: boolean;
    isSh2?: boolean;
    isSh3?: boolean;
    success: boolean;
}

export async function parseSpxBlockData(data: Uint8Array): Promise<SpxBlockResult> {
    const ui32s = new Uint32Array(data.slice(0, 8).buffer);

    const splatCount = ui32s[0];
    const blockFormat = ui32s[1];
    if (!SpxBlockFormats.includes(blockFormat)) {
        console.warn('unknown block format');
        return { splatCount, blockFormat, success: false };
    }

    const isSh1: boolean = SpxBlockFormatSH1 == blockFormat;
    const isSh2: boolean = SpxBlockFormatSH2 == blockFormat;
    const isSh3: boolean = SpxBlockFormatSH3 == blockFormat;

    const resultByteLength = splatCount * SplatDataSize32;
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    let blockCnt: number;
    if (isSh1) {
        blockCnt = Math.floor((splatCount * 16) / WasmBlockSize) + 2;
    } else if (isSh2) {
        blockCnt = Math.floor((splatCount * 24 + 8) / WasmBlockSize) + 2;
    } else if (isSh3) {
        blockCnt = Math.floor((splatCount * 21 + 8) / WasmBlockSize) + 2;
    } else {
        blockCnt = Math.floor((resultByteLength + data.byteLength) / WasmBlockSize) + 2;
    }

    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.D;

    const wasmMemory = new Uint8Array(memory.buffer);
    let code: number;
    if (isSh1) {
        const inputIndex: number = splatCount * 7 + ((splatCount * 9) % 4) + 8;
        wasmMemory.set(data, inputIndex);
        code = dataParser(0, inputIndex);
        if (!code) return { splatCount, blockFormat, success: true, datas: wasmMemory.slice(0, splatCount * 16), isSh: true, isSh1, isSh2, isSh3 };
    } else if (isSh2 || isSh3) {
        wasmMemory.set(data, 0);
        code = dataParser(0, 0);
        if (!code) return { splatCount, blockFormat, success: true, datas: wasmMemory.slice(0, splatCount * 16), isSh: true, isSh1, isSh2, isSh3 };
    } else {
        wasmMemory.set(data, resultByteLength);
        code = dataParser(0, resultByteLength);
        if (!code) return { splatCount, blockFormat, success: true, datas: wasmMemory.slice(0, resultByteLength), isSplat: true };
    }

    return { splatCount, blockFormat, success: false };
}

export async function parseSplatToTexdata(data: Uint8Array, splatCount: number): Promise<Uint8Array> {
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt = Math.floor((splatCount * SplatDataSize32) / WasmBlockSize) + 2;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.s;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data.slice(0, splatCount * SplatDataSize32), 0);
    const code: number = dataParser(0, splatCount);
    if (code) {
        console.error('splat data parser failed:', code);
        return new Uint8Array(0);
    }

    return wasmMemory.slice(0, splatCount * SplatDataSize32);
}

export async function parseWordToTexdata(x: number, y0z: number, isY: boolean = true, isNgativeY: boolean = true): Promise<Uint8Array> {
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataSplat: any = instance.exports.w;

    const wasmMemory = new Uint8Array(memory.buffer);
    const f32s = new Float32Array(wasmMemory.buffer);
    const ngativeY = isNgativeY ? -1 : 1;
    f32s[0] = x;
    isY ? (f32s[1] = ngativeY * y0z) : (f32s[2] = ngativeY * y0z);
    dataSplat(0, isY ? 1 : 0);
    return wasmMemory.slice(0, SplatDataSize32);
}

function expf(v: number) {
    return Math.exp(v);
}
