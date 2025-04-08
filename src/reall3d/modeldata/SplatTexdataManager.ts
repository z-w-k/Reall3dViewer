// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import {
    OnFetchStart,
    SplatTexdataManagerDispose,
    SplatTexdataManagerAddModel,
    GetMaxRenderCount,
    SplatMeshCycleZoom,
    SplatTexdataManagerDataChanged,
    OnFetching,
    OnFetchStop,
    Information,
    IsBigSceneMode,
    SetGaussianText,
    GetGaussianText,
    RunLoopByFrame,
    UploadSplatTexture,
    SplatUpdateTopY,
    GetSplatActivePoints,
    GetOptions,
} from '../events/EventConstants';
import { Events } from '../events/Events';
import { MetaData, ModelStatus, SplatModel } from './ModelData';
import { ModelOptions } from './ModelOptions';
import { loadSplat } from './loaders/SplatLoader';
import { isMobile, MobileDownloadLimitSplatCount, PcDownloadLimitSplatCount } from '../utils/consts/GlobalConstants';
import { isNeedReload } from '../utils/CommonUtils';
import { loadSpx } from './loaders/SpxLoader';
import { SplatMeshOptions } from '../meshs/splatmesh/SplatMeshOptions';

export function setupSplatTextureManager(events: Events) {
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);

    let disposed: boolean;
    let lastPostDataTime: number = Date.now() + 60 * 60 * 1000;

    let textWatermarkData: Uint8Array = null; // 水印数据
    let splatModel: SplatModel;
    let texture0: SplatTexdata = { index: 0, version: 0 };
    let texture1: SplatTexdata = { index: 1, version: 0 };
    let mergeRunning: boolean = false;

    const isBigSceneMode: boolean = fire(IsBigSceneMode);

    let fnResolveModelSplatCount: (value: unknown) => void;
    const promiseModelSplatCount: Promise<number> = new Promise(resolve => (fnResolveModelSplatCount = resolve));
    on(GetMaxRenderCount, async (): Promise<number> => {
        const opts: SplatMeshOptions = fire(GetOptions);
        let rs = isMobile ? opts.maxRenderCountOfMobile : opts.maxRenderCountOfPc;
        let textWatermarkPlusCnt = 10240; // 加上预留的动态文字水印数
        if (opts.bigSceneMode) {
            rs += textWatermarkPlusCnt;
        } else if ((await promiseModelSplatCount) < rs) {
            rs = (await promiseModelSplatCount) + textWatermarkPlusCnt; // 小场景如果模型数据点数小于最大渲染数，用模型数据点数计算即可，节省内存
        }
        return rs;
    });

    on(SetGaussianText, async (text: string, isY: boolean = true, isNgativeY: boolean = true) => {
        try {
            textWatermarkData = await fire(GetGaussianText, text, isY, isNgativeY);
            splatModel && (splatModel.textWatermarkVersion = Date.now());
        } catch (e) {
            console.info('failed to generate watermark');
        }
    });

    on(GetSplatActivePoints, () => (!isBigSceneMode || texture0.version < texture1.version ? texture0.xyz : texture1.xyz));

    async function mergeAndUploadData(isBigSceneMode: boolean) {
        if (disposed) return;
        if (splatModel && (splatModel.status === ModelStatus.Invalid || splatModel.status === ModelStatus.FetchFailed)) {
            return fire(OnFetchStop, 0) || fire(Information, { renderSplatCount: 0, visibleSplatCount: 0, modelSplatCount: 0 }); // 无效
        }
        if (!splatModel || !splatModel.downloadSplatCount) return; // 没数据

        const downloadDone = splatModel.status !== ModelStatus.FetchReady && splatModel.status !== ModelStatus.Fetching;
        if (downloadDone) {
            // 已下载完，通知一次进度条
            const downloadCount = Math.min(splatModel.opts.downloadLimitSplatCount, splatModel.downloadSplatCount);
            !splatModel.notifyFetchStopDone && (splatModel.notifyFetchStopDone = true) && fire(OnFetchStop, downloadCount);
        } else {
            // 没下载完，更新下载进度条
            fire(OnFetching, (100 * splatModel.downloadSize) / splatModel.fileSize);
        }

        if (mergeRunning) return;
        mergeRunning = true;
        setTimeout(async () => {
            await mergeAndUploadTextureData(downloadDone);
            mergeRunning = false;
        });
    }

    async function mergeAndUploadTextureData(downloadDone: boolean) {
        if (disposed) return;
        const texture = texture0;

        const txtWatermarkData = textWatermarkData;
        let dataSplatCount = splatModel.dataSplatCount;
        let watermarkCount = downloadDone ? splatModel.watermarkCount : 0;
        let textWatermarkCount = downloadDone ? (txtWatermarkData?.byteLength || 0) / 32 : 0; // 动态输入的文字水印数
        splatModel.renderSplatCount = dataSplatCount + watermarkCount + textWatermarkCount; // 渲染数

        fire(Information, { visibleSplatCount: splatModel.renderSplatCount, modelSplatCount: splatModel.modelSplatCount + textWatermarkCount }); // 可见数=模型数据总点数

        if (Date.now() - texture.textureReadyTime < (isMobile ? 600 : 300)) return; // 悠哉
        if (splatModel.smallSceneUploadDone && splatModel.lastTextWatermarkVersion == splatModel.textWatermarkVersion) return; // 已传完(模型数据 + 动态文字水印)

        if (!texture.version) {
            fire(SplatUpdateTopY, splatModel.header?.TopY || 0); // 初次传入高点

            let ver: string = splatModel.opts.format;
            if (splatModel.opts.format == 'spx') {
                ver = 'spx' + (splatModel.header.ExclusiveId ? (' ' + splatModel.header.ExclusiveId).substring(0, 6) : '');
            }
            fire(Information, { scene: `small (${ver})` }); // 初次提示场景模型版本
        }

        splatModel.lastTextWatermarkVersion = splatModel.textWatermarkVersion;
        texture.textureReady = false;

        // 合并（模型数据 + 动态文字水印）
        const maxRenderCount = await fire(GetMaxRenderCount);
        const texwidth = 1024 * 2;
        const texheight = Math.ceil((2 * maxRenderCount) / texwidth);

        const ui32s = new Uint32Array(texwidth * texheight * 4);
        const f32s = new Float32Array(ui32s.buffer);
        const mergeSplatData = new Uint8Array(ui32s.buffer);
        mergeSplatData.set(splatModel.splatData.slice(0, dataSplatCount * 32), 0);
        watermarkCount && mergeSplatData.set(splatModel.watermarkData.slice(0, watermarkCount * 32), dataSplatCount * 32);
        textWatermarkCount && mergeSplatData.set(txtWatermarkData.slice(0, textWatermarkCount * 32), (dataSplatCount + watermarkCount) * 32);

        const xyz = new Float32Array(splatModel.renderSplatCount * 3);
        for (let i = 0, n = 0; i < splatModel.renderSplatCount; i++) {
            xyz[i * 3] = f32s[i * 8];
            xyz[i * 3 + 1] = f32s[i * 8 + 1];
            xyz[i * 3 + 2] = f32s[i * 8 + 2];
        }

        const sysTime = Date.now();
        texture.version = sysTime;
        texture.txdata = ui32s;
        texture.xyz = xyz;
        texture.renderSplatCount = splatModel.renderSplatCount;
        texture.visibleSplatCount = splatModel.downloadSplatCount + textWatermarkCount;
        texture.modelSplatCount = splatModel.downloadSplatCount + textWatermarkCount;
        texture.watermarkCount = watermarkCount + textWatermarkCount;
        texture.minX = splatModel.minX;
        texture.maxX = splatModel.maxX;
        texture.minY = splatModel.minY;
        texture.maxY = splatModel.maxY;
        texture.minZ = splatModel.minZ;
        texture.maxZ = splatModel.maxZ;

        fire(UploadSplatTexture, texture, splatModel.currentRadius, splatModel.header?.MaxRadius || splatModel.currentRadius);
        lastPostDataTime = sysTime;

        if (downloadDone && !splatModel.smallSceneUploadDone) {
            splatModel.smallSceneUploadDone = true;
        }
        fire(Information, { renderSplatCount: splatModel.renderSplatCount });
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        splatModel?.abortController?.abort();
        splatModel?.map?.clear();
        splatModel = null;
        textWatermarkData = null;
        texture0 = null;
        texture1 = null;
    }

    function loadSplatModel(model: SplatModel) {
        if (model.opts.format === 'spx') {
            loadSpx(model);
        } else if (model.opts.format === 'splat') {
            loadSplat(model);
        } else {
            return false;
        }
        return true;
    }

    async function add(opts: ModelOptions, meta: MetaData) {
        if (disposed) return;
        const splatMeshOptions: SplatMeshOptions = fire(GetOptions);
        const maxRenderCount: number = isMobile ? splatMeshOptions.maxRenderCountOfMobile : splatMeshOptions.maxRenderCountOfPc;
        const isBigSceneMode: boolean = fire(IsBigSceneMode);

        opts.fetchReload = isNeedReload(meta.updateDate || 0); // 7天内更新的重新下载

        // 调整下载限制
        if (isBigSceneMode && meta.autoCut) {
            const bigSceneDownloadLimit = isMobile ? MobileDownloadLimitSplatCount : PcDownloadLimitSplatCount;
            opts.downloadLimitSplatCount = Math.min(meta.autoCut * meta.autoCut * maxRenderCount + maxRenderCount, bigSceneDownloadLimit);
        } else {
            opts.downloadLimitSplatCount = maxRenderCount;
        }

        splatModel = new SplatModel(opts, meta);
        const fnCheckModelSplatCount = () => {
            if (splatModel.status == ModelStatus.Invalid || splatModel.status == ModelStatus.FetchFailed) {
                return fnResolveModelSplatCount(0);
            }
            if (splatModel.modelSplatCount >= 0) {
                setTimeout(() => fire(SplatMeshCycleZoom), 5);
                fnResolveModelSplatCount(splatModel.modelSplatCount);
            } else {
                setTimeout(fnCheckModelSplatCount, 10);
            }
        };
        fnCheckModelSplatCount();

        if (!loadSplatModel(splatModel)) {
            console.error('Unsupported format:', opts.format);
            fire(OnFetchStop, 0);
            return;
        }
        fire(OnFetchStart);
    }

    on(SplatTexdataManagerAddModel, async (opts: ModelOptions, meta: MetaData) => await add(opts, meta));
    on(SplatTexdataManagerDataChanged, (msDuring: number = 10000) => Date.now() - lastPostDataTime < msDuring);
    on(SplatTexdataManagerDispose, () => dispose());

    fire(
        RunLoopByFrame,
        async () => await mergeAndUploadData(isBigSceneMode),
        () => !disposed,
    );
}
