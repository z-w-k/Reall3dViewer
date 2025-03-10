// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { BinHeader } from '../formats/BinFormat';
import { SplatDataSize20, SplatDataSize32, DataSize36, WasmBlockSize, DataSize32, SplatDataSize16 } from '../../utils/consts/GlobalConstants';

const WasmBase64 =
    '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';

export async function parseBinHeader(header: Uint8Array): Promise<any> {
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const headerParser: any = instance.exports.h;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(header, 0);
    const code: number = headerParser(0);
    if (code) {
        console.error('header parser failed:', code);
        return null;
    }
    const ui8s = wasmMemory.slice(140, 140 + 200);
    const ui32s = new Uint32Array(ui8s.buffer);
    const f32s = new Float32Array(ui8s.buffer);

    const rs: number[] = [];
    for (let i = 0; i < 40; i++) {
        rs.push(ui8s[i]);
    }
    for (let i = 10; i < 20; i++) {
        rs.push(ui32s[i]);
    }
    for (let i = 20; i < 50; i++) {
        rs.push(f32s[i]);
    }
    return { rs, ui8s };
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

export async function parseSplat20ToTexdata(data: Uint8Array, splatCount: number): Promise<Uint8Array> {
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt = Math.floor((splatCount * DataSize36) / WasmBlockSize) + 2;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.S;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data.slice(0, splatCount * SplatDataSize20), splatCount * (DataSize36 - SplatDataSize20));
    const code: number = dataParser(0, splatCount);
    if (code) {
        console.error('splat20 data parser failed:', code);
        return new Uint8Array(0);
    }

    return wasmMemory.slice(0, splatCount * SplatDataSize32);
}

export async function parseBinToTexdata(data: Uint8Array, splatCount: number, header: BinHeader): Promise<Uint8Array> {
    const dataSize = header.Version === 2 ? DataSize36 : DataSize32;
    const splatSize = header.Version === 2 ? SplatDataSize20 : SplatDataSize16;
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt = Math.floor((splatCount * dataSize) / WasmBlockSize) + 2;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.b;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data.slice(0, splatCount * splatSize), splatCount * (dataSize - splatSize));
    const code: number = dataParser(0, splatCount, ...header.getWasmTexdataParams());
    if (code) {
        console.error('bin data parser failed:', code);
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
