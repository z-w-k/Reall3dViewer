// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { BinHeader } from '../formats/BinFormat';
import { SplatDataSize20, SplatDataSize32, DataSize36, WasmBlockSize } from '../../utils/consts/GlobalConstants';

const WasmBase64 =
    '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';

export async function parseBinHeader(header: Uint8Array): Promise<number[]> {
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
    return rs;
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
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt = Math.floor((splatCount * DataSize36) / WasmBlockSize) + 2;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.b;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data.slice(0, splatCount * SplatDataSize20), splatCount * (DataSize36 - SplatDataSize20));
    const code: number = dataParser(0, splatCount, header.FactorPosition, header.FactorScale, header.Version);
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
