// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { SplatDataSize32 } from '../../utils/consts/GlobalConstants';
import { ModelStatus, SplatModel } from '../ModelData';
import { parseSplatToTexdata } from '../wasm/WasmBinParser';

export async function loadSplatJson(model: SplatModel) {
    fetch(model.opts.url, { mode: 'cors', credentials: 'omit', cache: 'reload' })
        .then(response => (!response.ok ? [] : response.json()))
        .then(async (datas: any[]) => {
            model.modelSplatCount = datas.length;
            model.downloadSplatCount = datas.length;
            const splatData = new Uint8Array(model.modelSplatCount * SplatDataSize32);
            const f32s = new Float32Array(splatData.buffer);
            for (let i = 0; i < datas.length; i++) {
                f32s[i * 8 + 0] = datas[i][0];
                f32s[i * 8 + 1] = datas[i][1];
                f32s[i * 8 + 2] = datas[i][2];
                f32s[i * 8 + 3] = datas[i][3];
                f32s[i * 8 + 4] = datas[i][4];
                f32s[i * 8 + 5] = datas[i][5];
                splatData[i * 32 + 24 + 0] = datas[i][6] | 0;
                splatData[i * 32 + 24 + 1] = datas[i][7] | 0;
                splatData[i * 32 + 24 + 2] = datas[i][8] | 0;
                splatData[i * 32 + 24 + 3] = datas[i][9] | 0;
                splatData[i * 32 + 28 + 0] = datas[i][10] | 0;
                splatData[i * 32 + 28 + 1] = datas[i][11] | 0;
                splatData[i * 32 + 28 + 2] = datas[i][12] | 0;
                splatData[i * 32 + 28 + 3] = datas[i][13] | 0;
            }
            model.splatData = await parseSplatToTexdata(splatData, model.modelSplatCount);
            const ui16s = new Uint16Array(model.splatData.buffer);
            for (let i = 0; i < datas.length; i++) {
                ui16s[i * 16 + 6] = datas[i].length > 14 ? datas[i][14] | 0 : 0;
                ui16s[i * 16 + 7] = datas[i].length > 15 ? datas[i][15] | 0 : 0;
            }
            model.status = ModelStatus.FetchDone;
        })
        .catch(e => {
            console.error(e);
            model.status = ModelStatus.FetchFailed;
        });
}
