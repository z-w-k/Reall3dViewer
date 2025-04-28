// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import {
    SplatDataSize16,
    SplatDataSize32,
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
    head.MinTopY = f32s[8];
    head.MaxTopY = f32s[9];
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
    const isSh1: boolean = SpxBlockFormatSH1 == blockFormat;
    const isSh2: boolean = SpxBlockFormatSH2 == blockFormat;
    const isSh3: boolean = SpxBlockFormatSH3 == blockFormat;
    const isSh: boolean = isSh1 || isSh2 || isSh3;
    const isSplat: boolean = !isSh;

    const resultByteLength = splatCount * (isSh ? SplatDataSize16 : SplatDataSize32);
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt: number = Math.floor((resultByteLength + data.byteLength) / WasmBlockSize) + 2;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.D;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data, resultByteLength);
    const code = dataParser(0, resultByteLength);
    if (code) return { splatCount, blockFormat, success: false };
    return { splatCount, blockFormat, success: true, datas: wasmMemory.slice(0, resultByteLength), isSplat, isSh, isSh1, isSh2, isSh3 };
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
