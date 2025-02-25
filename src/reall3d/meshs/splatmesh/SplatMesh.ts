// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Mesh, PerspectiveCamera } from 'three';
import { Events } from '../../events/Events';
import {
    SplatUpdatePerformanceNow,
    SplatUpdatePointMode,
    SplatUpdateLightFactor,
    IsPointcloudMode,
    CreateSplatMesh,
    SplatMeshDispose,
    SplatDataManagerDispose,
    WorkerDispose,
    GetScene,
    GetOptions,
    GetCanvas,
    GetRenderer,
    IsBigSceneMode,
    MaxModelFetchCount,
    SplatDataManagerAddModel,
    SplatDataManagerRemoveModel,
    SplatDataManagerRemoveAll,
    WorkerSort,
    IsFetching,
    SplatDataManagerDataChanged,
    NotifyViewerNeedUpdate,
    ViewerNeedUpdate,
    TraverseDisposeAndClear,
    GetCamera,
    GetCameraFov,
    GetCameraPosition,
    GetViewProjectionMatrixArray,
    GetViewProjectionMatrix,
    CommonUtilsDispose,
    GetSplatMesh,
} from '../../events/EventConstants';
import { setupSplatDataManager } from '../../modeldata/ModelDataManager';
import { SplatMeshOptions } from './SplatMeshOptions';
import { ModelOptions } from '../../modeldata/ModelOptions';
import { setupSplatMesh } from './SetupSplatMesh';
import { setupGaussianText } from '../../modeldata/text/SetupGaussianText';
import { setupApi } from '../../api/SetupApi';
import { initSplatMeshOptions } from '../../utils/ViewerUtils';
import { setupCommonUtils } from '../../utils/CommonUtils';
import { setupWorker } from '../../worker/SetupWorker';

export class SplatMesh extends Mesh {
    public readonly isSplatMesh: boolean = true;
    public meta: any;
    private disposed: boolean = false;
    private events: Events;
    private opts: SplatMeshOptions;

    /**
     * 构造函数
     * @param options 渲染器、场景、相机都应该传入
     */
    constructor(options: SplatMeshOptions) {
        super();

        const events = new Events();
        const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
        const fire = (key: number, ...args: any): any => events.fire(key, ...args);

        // 默认参数校验设定
        const opts: SplatMeshOptions = initSplatMeshOptions(options);

        const camera = opts.camera as PerspectiveCamera;
        on(GetOptions, () => opts);
        on(GetCanvas, () => opts.renderer.domElement);
        on(GetCamera, () => camera);
        on(GetCameraFov, () => camera.fov);
        on(GetCameraPosition, (copy: boolean = false) => (copy ? camera.position.clone() : camera.position));
        on(GetViewProjectionMatrixArray, () => camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse).multiply(this.matrix).toArray());
        on(GetViewProjectionMatrix, () => camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse));
        on(GetRenderer, () => opts.renderer);
        on(GetScene, () => opts.scene);
        on(IsBigSceneMode, () => opts.bigSceneMode);
        on(IsPointcloudMode, () => opts.pointcloudMode);
        on(MaxModelFetchCount, () => opts.maxFetchCount);
        on(GetSplatMesh, () => this);

        on(NotifyViewerNeedUpdate, () => opts.viewerEvents?.fire(ViewerNeedUpdate));

        setupCommonUtils(events);
        setupWorker(events);
        setupSplatMesh(events);
        setupSplatDataManager(events);
        setupGaussianText(events);
        setupApi(events);

        this.copy(events.fire(CreateSplatMesh));
        this.frustumCulled = false;
        this.name = `${opts.name || this.id}`;

        this.events = events;
        this.opts = opts;

        this.onBeforeRender = () => {
            fire(WorkerSort);
            fire(SplatUpdatePerformanceNow, performance.now());
        };
        this.onAfterRender = () => {
            (fire(IsFetching) || fire(SplatDataManagerDataChanged, 3000)) && fire(NotifyViewerNeedUpdate); // 下载中或3秒内有数据变化，则通知更新
        };
    }

    /**
     * 设定或者获取最新配置项
     * @param opts 配置项
     * @returns 最新配置项
     */
    public options(opts?: SplatMeshOptions): SplatMeshOptions {
        if (this.disposed) return;
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);
        const thisOpts = this.opts;

        if (opts) {
            opts.bigSceneMode !== undefined && (thisOpts.bigSceneMode = opts.bigSceneMode);
            opts.pointcloudMode !== undefined && fire(SplatUpdatePointMode, opts.pointcloudMode);
            opts.lightFactor !== undefined && fire(SplatUpdateLightFactor, opts.lightFactor);
            opts.maxRenderCountOfMobile !== undefined && (thisOpts.maxRenderCountOfMobile = opts.maxRenderCountOfMobile);
            opts.maxRenderCountOfPc !== undefined && (thisOpts.maxRenderCountOfPc = opts.maxRenderCountOfPc);
            opts.maxFetchCount !== undefined && (opts.maxFetchCount = opts.maxFetchCount >= 1 && opts.maxFetchCount <= 32 ? opts.maxFetchCount : 16);

            fire(NotifyViewerNeedUpdate);
        }
        return { ...thisOpts };
    }

    /**
     * 添加渲染指定高斯模型
     * @param url 高斯模型地址
     * @param opts 高斯模型选项
     */
    public async addModel(url: string, opts: ModelOptions = {}): Promise<void> {
        if (this.disposed) return;
        this.events.fire(SplatDataManagerAddModel, url, opts);
    }

    /**
     * 删除渲染中的指定高斯模型
     * @param url 高斯模型地址
     */
    public removeModel(url: string): void {
        if (this.disposed) return;
        this.events.fire(SplatDataManagerRemoveModel, url);
    }

    /**
     * 删除渲染中的全部高斯模型
     */
    public removeAll(): void {
        if (this.disposed) return;
        this.events.fire(SplatDataManagerRemoveAll);
        this.opts.url = null;
    }

    public fire(key: number, ...args: any): any {
        if (this.disposed) return;
        return this.events.fire(key, ...args);
    }

    /**
     * 销毁
     */
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);

        fire(TraverseDisposeAndClear, this);
        fire(GetScene).remove(this);

        fire(CommonUtilsDispose);
        fire(SplatDataManagerDispose);
        fire(WorkerDispose);
        fire(SplatMeshDispose);

        this.events.clear();
        this.events = null;
        this.opts = null;
        this.onAfterRender = null;
    }
}
