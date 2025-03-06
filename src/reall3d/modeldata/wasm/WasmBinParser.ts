// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { BinHeader } from '../formats/BinFormat';
import { SplatDataSize20, SplatDataSize32, DataSize36, WasmBlockSize, DataSize32, SplatDataSize18 } from '../../utils/consts/GlobalConstants';

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
    const splatSize = header.Version === 2 ? SplatDataSize20 : SplatDataSize18;
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt = Math.floor((splatCount * dataSize + 200) / WasmBlockSize) + 20;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory, expf } });
    const dataParser: any = instance.exports.b;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data.slice(0, splatCount * splatSize), splatCount * (dataSize - splatSize));
    const code: number = dataParser(
        0,
        splatCount,
        header.FactorPosition,
        header.FactorScale,
        header.Version,
        header.MinX,
        header.MaxX,
        header.MinY,
        header.MaxY,
        header.MinZ,
        header.MaxZ,
    );
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
