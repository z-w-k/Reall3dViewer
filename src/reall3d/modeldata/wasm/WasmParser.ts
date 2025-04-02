// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { SplatDataSize32, WasmBlockSize } from '../../utils/consts/GlobalConstants';
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
    head.Reserve1 = ui32s[13];
    head.Reserve2 = ui32s[14];
    head.Reserve3 = ui32s[15];

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

export async function parseSpxBlockData(data: Uint8Array): Promise<Uint8Array | null> {
    const ui32s = new Uint32Array(data.buffer);
    const resultByteLength = ui32s[0] * SplatDataSize32;
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt = Math.floor((resultByteLength + data.byteLength) / WasmBlockSize) + 2;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.D;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data, resultByteLength);
    const code: number = dataParser(0, resultByteLength);
    return code ? null : wasmMemory.slice(0, resultByteLength);
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
