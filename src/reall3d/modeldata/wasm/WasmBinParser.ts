// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { BinHeader } from '../formats/BinFormat';
import { Bin2DataSize, SplatDataSize36, WasmBlockSize } from '../../utils/consts/GlobalConstants';

const WasmBase64 =
    'AGFzbQEAAAAADwhkeWxpbmsuMAEEAAAAAAEXBGAAAGABfwF/YAV/f319fwF/YAJ/fwACDwEDZW52Bm1lbW9yeQIAAAMFBAABAgMHIQQRX193YXNtX2NhbGxfY3RvcnMAAAFoAAEBZAACAXcAAwq7CAQDAAELlgUCA38Be0EBIQECQCAALQAAQfkARw0AIAAtAAFB4wBHDQAgAC0AAiIDQQNrQf8BcUH+AUkEQEECDwsgA0ECRgRAQQMhAQNAIAAgAWoiAiACLQAAQfkAQeMAIAFBAXEbczoAACABQQFqIgFBjAFHDQALC0GVowMhAkEAIQEDQCAAIAFqLQAAIAJBIWxzIQIgAUEBaiIBQYgBRw0ACyAAKAKIASACRwRAQQMPCwJAIANBAUcEQCAAIAAtAAI2ArQBIAAgAC0AAzYCuAEgACAAKQIENwK8ASAAIAAvAQw2AsQBIAAgAP0AAhD9CwLcASAAIAD9AAIg/QsC7AEgACAA/QACMP0LAvwBIAAgAC0ADSIBQQd2/REgAUEGdv0cASABQQV2/RwCIAFBBHb9HAMgAUEDdv0RIAFBAnb9HAEgAUEBdv0cAiAB/RwD/Q0ABAgMEBQYHAAAAAAAAAAA/QwBAQEBAQEBAQEBAQEBAQEBIgT9TiAALQAMIgFBB3b9ESABQQZ2/RwBIAFBBXb9HAIgAUEEdv0cAyABQQN2/REgAUECdv0cASABQQF2/RwCIAH9HAP9DQAECAwQFBgcAAAAAAAAAAAgBP1O/Q0AAQIDBAUGBxAREhMUFRYX/QsAjAEgACAA/QACQP0LAowCIAAgAjYC0AEgACAA/QACUP0LApwCIAAgAP0AAmD9CwKsAiAAIAAqAnA4ArwCIAAgACkCdDcCyAEgACAAKgJ8OALAAiAAIAApAoABNwLEAgwBCyAAIAAtAAI2ArQBIAAgAC0AAzYCuAEgACAAKQIENwK8ASAAIAD9AAIQ/QsC3AEgACAA/QACIP0LAuwBIAAgACoCMDgC/AEgACAAKQI0NwKAAgtBACEBCyABC9QCAQl/IARBAkcEQEEBDwsgAUEEdCIFIAFBJGwiBkgEQCAFIQQDQCAAIARqIgcgBy0AAEHjAEH5ACAEQQFxG3M6AAAgBEEBaiIEIAZHDQALCyABQQBMBEBBAA8LIAFBA3QhCSADQwD4/0WVIQMgAkMA/v9GlSECIAAgBWohCkEAIQUDQCAAIAVBCmwgCWpBAXRqIgQvAQohBiAELwEIIQcgBC8BBiEIIAQuAQQhCyAELgECIQwgBC4BACENIAAgBUEkbGoiBCAKIAVBFGxqKQIMNwIYIAQgAiANspQ4AgAgBCACIAyylDgCBCAEIAIgC7KUOAIIIAQgAyAIQf+/AnGzlDgCDCAEIAMgB0H/vwJxs5Q4AhAgBCADIAZB/78CcbOUOAIUIAQgBkENdkEDcSAHQQt2QQxxIAhBgIABcUECdHJyNgIgIAVBAWoiBSABRw0AC0EAC0cAIABBCEEEIAFBAUYbakEANgIAIABBgIAENgIgIABC/4H816DBm7yCfzcAGCAAQY+F1+MDNgIUIABC9PvT4qOI2LI8NwIMCw==';

export async function parseBinHeader(header: Uint8Array): Promise<number[]> {
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory } });
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

export async function parseBin2Data(data: Uint8Array, splatCount: number, header: BinHeader): Promise<Uint8Array> {
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const blockCnt = Math.floor((splatCount * SplatDataSize36) / WasmBlockSize) + 2;
    const memory = new WebAssembly.Memory({ initial: blockCnt, maximum: blockCnt });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory } });
    const dataParser: any = instance.exports.d;

    const wasmMemory = new Uint8Array(memory.buffer);
    wasmMemory.set(data.slice(0, splatCount * Bin2DataSize), splatCount * (SplatDataSize36 - Bin2DataSize));
    const code: number = dataParser(0, splatCount, header.FactorPosition, header.FactorScale, header.Version);
    if (code) {
        console.error('data parser failed:', code);
        return new Uint8Array(0);
    }

    return wasmMemory.slice(0, splatCount * SplatDataSize36);
}

export async function genWatermarkSplatData(x: number, y0z: number, isY: boolean = true, isNgativeY: boolean = true): Promise<Uint8Array> {
    const wasmModule = WebAssembly.compile(Uint8Array.from(atob(WasmBase64), c => c.charCodeAt(0)).buffer);
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
    const instance = await WebAssembly.instantiate(await wasmModule, { env: { memory } });
    const dataSplat: any = instance.exports.w;

    const wasmMemory = new Uint8Array(memory.buffer);
    const f32s = new Float32Array(wasmMemory.buffer);
    const ngativeY = isNgativeY ? -1 : 1;
    f32s[0] = x;
    isY ? (f32s[1] = ngativeY * y0z) : (f32s[2] = ngativeY * y0z);
    dataSplat(0, isY ? 1 : 0);
    return wasmMemory.slice(0, SplatDataSize36);
}
