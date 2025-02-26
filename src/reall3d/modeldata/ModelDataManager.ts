// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import {
    IsCameraChangedNeedLoadData,
    OnFetchStart,
    SplatDataManagerDispose,
    SplatDataManagerAddModel,
    SplatDataManagerRemoveModel,
    SplatDataManagerRemoveAll,
    GetMaxRenderCount,
    MaxModelFetchCount,
    SplatMeshCycleZoom,
    SplatDataManagerDataChanged,
    IsFetching,
    OnFetching,
    LoaderModelStart,
    GetWorker,
    RunLoopByTime,
    OnFetchStop,
    Information,
    IsBigSceneMode,
    GetViewProjectionMatrix,
    GetCameraPosition,
    SetGaussianText,
    GetGaussianText,
    GetOptions,
    GetSplatMesh,
    OnRenderDataUpdateDone,
    GetCameraLookAt,
} from '../events/EventConstants';
import { Matrix4, Vector3, Vector4 } from 'three';
import { Events } from '../events/Events';
import { ModelStatus, SplatModel } from './ModelData';
import { ModelOptions } from './ModelOptions';
import { loadBin } from './loaders/BinLoader';
import { loadSplat } from './loaders/SplatLoader';
import {
    WkBinVersion,
    WkIsBigSceneMode,
    WkMaxRadius,
    WkModelSplatCount,
    WkRenderSplatCount,
    WkSplatDataBuffer,
    WkTopY,
    WkVersion,
    WkVisibleSplatCount,
} from '../utils/consts/WkConstants';
import { isMobile, MobileDownloadLimitSplatCount, PcDownloadLimitSplatCount, SplatDataSize36 } from '../utils/consts/GlobalConstants';
import { loadSplatJson } from './loaders/SplatJsonLoader';
import { SplatMeshOptions } from '../meshs/splatmesh/SplatMeshOptions';
import { SplatMesh } from '../meshs/splatmesh/SplatMesh';

class SplatDataManager {
    private disposed: boolean;
    private events: Events;
    private map: Map<string, SplatModel>;
    private totalRenderSplatCount: number = 0; // 渲染数
    private totalModelSplatCount: number = 0; // 总数
    private versionScene: number = 0;
    private lastVersionScene: number = 0;
    public lastPostDataTime: number = Date.now() + 60 * 60 * 1000;
    private doingPostData: boolean = false;

    private watermarkData: Uint8Array = null; // 水印数据

    constructor(events: Events) {
        this.events = events;
        this.map = new Map();

        events.on(SetGaussianText, async (text: string, isY: boolean = true, isNgativeY: boolean = true) => {
            try {
                this.watermarkData = text ? await events.fire(GetGaussianText, text, isY, isNgativeY) : null;
                this.versionScene++;
            } catch (e) {
                console.info('failed to generate watermark');
            }
        });

        events.on(OnRenderDataUpdateDone, (dataTime: number) => (dataTime < 0 || dataTime >= this.lastPostDataTime) && (this.doingPostData = false));

        let delay = isMobile ? (events.fire(IsBigSceneMode) ? 1000 : 300) : events.fire(IsBigSceneMode) ? 200 : 100;
        setTimeout(() => {
            !this.disposed &&
                events.fire(
                    RunLoopByTime,
                    () => {
                        if (!this.doingPostData || Date.now() - this.lastPostDataTime >= 5 * 1000) {
                            this.doingPostData = true;
                            this.doingPostData = this.getRenderSplatData();
                        }
                    },
                    () => !this.disposed,
                    delay,
                );
        }, 300);
    }

    public add(opts: ModelOptions) {
        if (this.disposed) return;
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);
        const MaxRenderCount: number = fire(GetMaxRenderCount);
        const isBigSceneMode: boolean = fire(IsBigSceneMode);
        const meta: any = (fire(GetSplatMesh) as SplatMesh).meta || {};

        // 小场景
        if (!isBigSceneMode) {
            this.removeAll();

            (!opts.limitSplatCount || opts.limitSplatCount < 1) && (opts.limitSplatCount = MaxRenderCount);
            const model = new SplatModel(opts, meta);
            if (!fire(LoaderModelStart, model)) {
                console.error('Unsupported format:', opts.format);
                return;
            }

            this.map.set(opts.url, model);
            fire(OnFetchStart);

            fire(SplatMeshCycleZoom);
            return;
        }

        // 大场景
        let old = this.map.get(opts.url);
        if (old && (old.status === ModelStatus.FetchReady || old.status === ModelStatus.Fetching || old.status === ModelStatus.FetchDone)) {
            return; // 【就绪 | 正在下载 | 正常完成】状态时，直接使用，跳过
        }
        old && this.map.delete(opts.url);
        !opts.limitSplatCount && (opts.limitSplatCount = MaxRenderCount);
        opts.fetchReload ??= false;
        const splatModel = new SplatModel(opts, meta);
        meta.autoCut && (splatModel.map = this.map);
        this.map.set(opts.url, splatModel); // 待调度处理
        fire(OnFetchStart);
    }

    private getRenderSplatData(): boolean {
        if (this.disposed) return false;
        const that = this;
        const fire = (key: number, ...args: any): any => that.events.fire(key, ...args);
        const isBigSceneMode: boolean = fire(IsBigSceneMode);

        // 计算下载状况，删除下载失败的模型
        let downloading = 0;
        let downloaded = 0;
        let totalSplatCount = 0;
        let totalDownloadSplatCount = 0;
        let totalFiles = 0;
        let dels = [];
        let cacheModels = [];
        let readyModels: SplatModel[] = [];
        for (const model of that.map.values()) {
            !model.meta?.autoCut && (totalDownloadSplatCount += model.downloadSplatCount);

            if (model.status === ModelStatus.FetchReady) {
                readyModels.push(model);
            } else if (model.status === ModelStatus.Fetching) {
                downloading++;
                totalSplatCount += model.modelSplatCount;
            } else if (model.status === ModelStatus.FetchDone || model.status === ModelStatus.FetchAborted) {
                !model.opts.dataOnly && downloaded++;
                totalSplatCount += model.modelSplatCount;
            }

            if (model.status === ModelStatus.CancelFetch || model.status === ModelStatus.FetchFailed || model.status === ModelStatus.Invalid) {
                dels.push(model.opts.url);
            } else if (model.opts.format === 'splat' || model.opts.format === 'bin' || model.opts.format === 'json' || model.opts.dataOnly) {
                !model.meta?.autoCut && cacheModels.push(model);
                !model.opts.dataOnly && totalFiles++;
            }
        }
        for (const url of dels) {
            that.map.delete(url);
        }
        dels.length && that.versionScene++;

        // 超过限制时终止下载
        if (isBigSceneMode && totalDownloadSplatCount >= (isMobile ? MobileDownloadLimitSplatCount : PcDownloadLimitSplatCount)) {
            for (const model of that.map.values()) {
                model.status === ModelStatus.FetchReady && (model.status = ModelStatus.CancelFetch);
                model.status === ModelStatus.Fetching && model.abortController.abort();
            }
        }

        // 调度触发下载，最多同时请求N个下载
        for (let i = 0, max = Math.min(readyModels.length, fire(MaxModelFetchCount) - downloading); i < max; i++) {
            if (fire(LoaderModelStart, readyModels[i])) {
                downloading++;
                that.versionScene++;
            }
        }

        fire(Information, { totalSplatCount, models: `${downloaded} / ${totalFiles}, ${downloading} downloading` });

        // 判断是否跳过以提高性能
        if (isBigSceneMode) {
            // 大场景模式(动态多模型)，相机没有变化且数据没有变化（全下载完且全要渲染）时应跳过
            let lastVersionScene = that.versionScene;
            if (
                !fire(IsCameraChangedNeedLoadData) && // 相机没变
                that.totalModelSplatCount > 0 && // 当前应该有可下载的模型数据
                !downloading && // 当前数据都下载完了
                that.lastVersionScene == lastVersionScene && // 当前场景(数据版本)没变化
                that.totalRenderSplatCount == that.totalModelSplatCount // 当前是全部要渲染
            ) {
                return false;
            }
            that.lastVersionScene = lastVersionScene;
        } else {
            // 小场景模式(单模型)，判断数据没变化时跳过
            let lastVersionScene = that.versionScene;
            if (that.lastVersionScene == lastVersionScene && !fire(IsFetching)) {
                return false;
            }
            that.lastVersionScene = lastVersionScene;
        }

        // 计算获取待渲染数据
        let ary: SplatModel[] = [];
        const limitRenderCount: number = fire(GetMaxRenderCount);
        let totalRenderSplatCount = 0;
        let totalVisibleSplatCount = 0;
        let totalModelSplatCount = 0;
        let alldone = !downloading;

        let perLimit = 1; // 默认全渲染，超出限制时计算占比
        // console.time('perLimit');
        for (const model of cacheModels) {
            totalModelSplatCount += model.modelSplatCount;
            model.hide = true;

            if (
                (model.status === ModelStatus.Fetching || model.status === ModelStatus.FetchDone || model.status === ModelStatus.FetchAborted) &&
                model.downloadSplatCount > 0
            ) {
                if (isBigSceneMode) {
                    // 大场景模式，计算可渲染数量
                    // console.time('checkAabb');
                    const rs = that.checkAabb(fire(GetViewProjectionMatrix), fire(GetCameraPosition), fire(GetCameraLookAt), model);
                    // console.timeEnd('checkAabb');
                    model.checkVisible = rs.check;
                    if (rs.check) {
                        model.checkDistance = rs.distance;
                        model.downloadSplatCountTmp = model.downloadSplatCount;
                        totalVisibleSplatCount += model.downloadSplatCountTmp; // 累加当前时点可见模型的已下载数
                        model.hide = false;
                        model.allocatedPercent = 1;
                        ary.push(model);
                    }
                } else {
                    // 小场景模式
                    model.hide = false;
                    ary.push(model);
                }
            }

            if (model.status === ModelStatus.FetchReady || model.status === ModelStatus.Fetching) {
                alldone = false;
            }
        }
        if (isBigSceneMode && totalVisibleSplatCount > limitRenderCount) {
            perLimit = limitRenderCount / totalVisibleSplatCount;
        }

        fire(Information, { renderModels: `${ary.length}` });

        // console.timeEnd('perLimit');

        ary.sort((a, b) => a.checkDistance - b.checkDistance);
        if (perLimit < 0.95) {
            // 手动调整权重，让近处更加清晰
            for (const model of ary) {
                if (model.checkDistance < 5) {
                    model.checkDistance *= 0.5;
                } else if (model.checkDistance < 4) {
                    model.checkDistance *= 0.4;
                } else if (model.checkDistance < 3) {
                    model.checkDistance *= 0.3;
                } else if (model.checkDistance < 2) {
                    model.checkDistance *= 0.1;
                }
            }
        }

        const opts: SplatMeshOptions = fire(GetOptions);
        let watermarkCount: number = 0;
        if (opts.showWaterMark && this.watermarkData) {
            watermarkCount = (this.watermarkData.byteLength / SplatDataSize36) | 0;
        }

        for (const model of ary) {
            if (isBigSceneMode) {
                if (perLimit < 0.95) this.allocatePoints(ary, limitRenderCount);
                model.renderSplatCount = Math.floor(model.downloadSplatCountTmp * model.allocatedPercent);
                totalRenderSplatCount += model.renderSplatCount;
            } else {
                model.renderSplatCount = model.downloadSplatCount > limitRenderCount ? limitRenderCount : model.downloadSplatCount;
                totalRenderSplatCount = model.renderSplatCount;
            }
        }
        totalRenderSplatCount += watermarkCount;

        if (totalRenderSplatCount > limitRenderCount) {
            // 检查校验渲染数量避免溢出（有水印等影响因素可能发生）
            let delCnt = totalRenderSplatCount - limitRenderCount;
            for (let i = ary.length - 1; i >= 0; i--) {
                if (delCnt <= 0) break;
                let model = ary[i];
                if (model.renderSplatCount >= delCnt) {
                    totalRenderSplatCount -= delCnt;
                    model.renderSplatCount -= delCnt;
                    model.allocatedPoints -= delCnt;
                    model.allocatedPercent = model.allocatedPoints / model.downloadSplatCountTmp;
                    delCnt = 0;
                } else {
                    totalRenderSplatCount -= model.renderSplatCount;
                    delCnt -= model.renderSplatCount;
                    model.renderSplatCount = 0;
                    model.allocatedPoints = 0;
                    model.allocatedPercent = 0;
                }
            }
            // console.info('delCnt=', delCnt, 'totalRenderSplatCount=', totalRenderSplatCount, 'limitRenderCount=', limitRenderCount);
        }

        alldone && fire(OnFetchStop, totalRenderSplatCount); // 会频繁触发（大场景模式下数据会不断变化，控制logo转动）

        if (
            (!isBigSceneMode && totalRenderSplatCount && that.totalRenderSplatCount === totalRenderSplatCount) ||
            (isBigSceneMode &&
                totalRenderSplatCount &&
                that.totalRenderSplatCount === totalRenderSplatCount &&
                totalRenderSplatCount < limitRenderCount)
        ) {
            return false; // 要渲染的总数没变，按数据没变化看待，跳过
        }
        that.totalRenderSplatCount = totalRenderSplatCount;
        that.totalModelSplatCount = totalModelSplatCount;

        let readLength = 0;
        let tmpLen = 0;
        let mergeSplatData: Uint8Array = null;
        if (isBigSceneMode) {
            // 大场景时，合并数据上传
            mergeSplatData = new Uint8Array(totalRenderSplatCount * SplatDataSize36);
            if (watermarkCount) {
                mergeSplatData.set(this.watermarkData.slice(0, watermarkCount * SplatDataSize36), 0);
                readLength = watermarkCount * SplatDataSize36;
            }
            for (const model of ary) {
                tmpLen = model.renderSplatCount * SplatDataSize36;
                tmpLen && mergeSplatData.set(model.splatData.slice(0, tmpLen), readLength);
                readLength += tmpLen;
            }
        } else {
            // 小场景时，单模型已下载的都上传（下载到限制点时不会再下载）
            let model: SplatModel = ary.length ? ary[0] : null;
            if (model) {
                totalVisibleSplatCount = model.downloadSplatCount;
                let statusLoaded = model.status === ModelStatus.FetchDone || model.status === ModelStatus.FetchAborted;
                mergeSplatData = new Uint8Array((totalRenderSplatCount + watermarkCount) * SplatDataSize36);
                mergeSplatData.set(model.splatData.slice(0, model.renderSplatCount * SplatDataSize36), 0);
                if (statusLoaded && watermarkCount) {
                    mergeSplatData.set(this.watermarkData.slice(0, watermarkCount * SplatDataSize36), model.renderSplatCount * SplatDataSize36);
                    totalVisibleSplatCount += watermarkCount;
                    totalModelSplatCount += watermarkCount;
                }
                fire(OnFetching, (100 * model.downloadSize) / model.fileSize); // 小场景下载进度条
            } else {
                totalRenderSplatCount = 0;
                totalVisibleSplatCount = 0;
                totalModelSplatCount = 0;
                mergeSplatData = new Uint8Array(0);
            }
        }

        let topY: number = 0;
        let maxRadius: number = 0;
        let binVer: number = 0;
        if (!isBigSceneMode && ary.length && ary[0].opts.format === 'bin') {
            topY = ary[0].binHeader.TopY;
            maxRadius = ary[0].binHeader.MaxRadius;
            binVer = ary[0].binHeader.Version;
        }

        const worker: Worker = fire(GetWorker);
        const time = Date.now();
        that.lastPostDataTime = time;
        worker.postMessage({
            [WkSplatDataBuffer]: mergeSplatData.buffer,
            [WkRenderSplatCount]: totalRenderSplatCount,
            [WkVisibleSplatCount]: totalVisibleSplatCount,
            [WkModelSplatCount]: totalModelSplatCount,
            [WkIsBigSceneMode]: isBigSceneMode,
            [WkBinVersion]: binVer,
            [WkTopY]: topY,
            [WkMaxRadius]: maxRadius,
            [WkVersion]: time,
        });

        fire(Information, { scene: isBigSceneMode ? 'big' : binVer ? `small (v${binVer})` : `small (${ary[0]?.opts.format || 'splat'})` });
        return true;
    }

    private allocatePoints(models: SplatModel[], maxPoints: number): void {
        // 1. 计算每个模型的权重（距离越近权重越大）
        const weights = models.map(model => 1 / (model.checkDistance + 1e-6)); // 避免除以零
        // 2. 计算总权重
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        // 3. 初步分配点数
        let totalAllocated = 0;
        models.forEach((model, index) => {
            // 根据权重分配点数，但不能超过模型本身的点数
            model.allocatedPoints = Math.min(Math.floor((weights[index] / totalWeight) * maxPoints), model.downloadSplatCountTmp);
            totalAllocated += model.allocatedPoints;
        });

        // 4. 如果总分配点数小于 M，将剩余点数按权重分配给未达到上限的模型
        if (totalAllocated < maxPoints) {
            const remainingPoints = maxPoints - totalAllocated;
            const remainingWeights = models.map((model, index) => {
                // 只有未达到上限的模型才能分配剩余点数
                if (model.allocatedPoints < model.downloadSplatCountTmp) {
                    return weights[index];
                }
                return 0;
            });
            const remainingTotalWeight = remainingWeights.reduce((sum, weight) => sum + weight, 0);

            // 按权重分配剩余点数
            models.forEach((model, index) => {
                if (remainingTotalWeight > 0 && model.allocatedPoints < model.downloadSplatCountTmp) {
                    const additionalPoints = Math.min(
                        Math.floor((remainingWeights[index] / remainingTotalWeight) * remainingPoints),
                        model.downloadSplatCountTmp - model.allocatedPoints,
                    );
                    model.allocatedPoints += additionalPoints;
                    totalAllocated += additionalPoints;
                }
            });
        }

        // 5. 计算每个模型的占比（per = allocatedPoints / count）
        models.forEach(model => {
            model.allocatedPercent = model.allocatedPoints / model.downloadSplatCountTmp;
        });
    }

    private checkAabb(viewProjMatrix: Matrix4, cameraPosition: Vector3, cameraLookAt: Vector3, model: SplatModel): Partial<Record<string, any>> {
        if (!model.binHeader) return { check: true, distance: 0 };
        const header = model.binHeader;

        const matrix = (this.events.fire(GetOptions) as SplatMeshOptions).matrix || new Matrix4(); // 模型矩阵
        const center: Vector3 = new Vector3(header.CenterX, header.CenterY, header.CenterZ).applyMatrix4(matrix);
        const distance: number = center.distanceTo(cameraPosition);
        if (distance <= header.MaxRadius * 1.5 || center.distanceTo(cameraLookAt) <= header.MaxRadius * 2) {
            return { check: true, distance };
        }

        let pos2d: Vector4;
        let clip: number;
        let range: number = 1.2;

        pos2d = new Vector4(header.CenterX, header.CenterY, header.CenterZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MinX, header.MinY, header.MinZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MinX, header.MinY, header.MaxZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MinX, header.MaxY, header.MinZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MinX, header.MaxY, header.MaxZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MaxX, header.MinY, header.MinZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MaxX, header.MinY, header.MaxZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MaxX, header.MaxY, header.MinZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        pos2d = new Vector4(header.MaxX, header.MaxY, header.MaxZ, 1).applyMatrix4(matrix).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return { check: true, distance };
        }
        // console.info('ignore', item.url);
        return { check: false, distance: 0 };
    }

    public remove(url: string) {
        if (this.disposed) return;
        let model = this.map.get(url);
        if (!model) return;

        model.abortController.abort();
        this.map.delete(url);
        this.versionScene++;
    }
    public removeAll() {
        if (this.disposed) return;
        this.map.forEach(item => {
            item.status = ModelStatus.Invalid; // 强制丢弃
            item.abortController.abort();
        });
        this.map.clear();
        this.versionScene++;

        this.events.fire(OnFetchStop);
    }

    public dispose() {
        if (this.disposed) return;
        this.removeAll();
        this.disposed = true;
        this.events = null;
        this.map = null;
    }
}

export function setupSplatDataManager(events: Events) {
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);

    on(LoaderModelStart, (model: SplatModel) => {
        if (model.opts.format === 'bin') {
            loadBin(model);
        } else if (model.opts.format === 'splat') {
            loadSplat(model);
        } else if (model.opts.format === 'json') {
            loadSplatJson(model);
        } else {
            return false;
        }
        return true;
    });

    const manager = new SplatDataManager(events);
    on(SplatDataManagerAddModel, (opts: ModelOptions) => manager.add(opts));
    on(SplatDataManagerRemoveModel, (url: string) => manager.remove(url));
    on(SplatDataManagerRemoveAll, () => manager.removeAll());
    on(SplatDataManagerDataChanged, (msDuring: number = 3000) => Date.now() - manager.lastPostDataTime < msDuring);
    on(SplatDataManagerDispose, () => manager.dispose());
}
