// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import '../style/style.less';
import { Scene, AmbientLight, WebGLRenderer } from 'three';
import {
    ClearMarkPoint,
    CommonUtilsDispose,
    CreateFocusMarkerMesh,
    CSS3DRendererDispose,
    EventListenerDispose,
    GetMarkFromWeakRef,
    ViewerDispose,
    Information,
    IsCameraChangedNeedUpdate,
    KeyActionCheckAndExecute,
    LoadSmallSceneMetaData,
    MetaMarkSaveData,
    MarkUpdateVisible,
    OnViewerAfterUpdate,
    OnViewerDisposeResetVars,
    OnViewerUpdate,
    RunLoopByTime,
    MetaSaveSmallSceneCameraInfo,
    SetGaussianText,
    SetSmallSceneCameraNotReady,
    SplatSetPointcloudMode,
    SplatSwitchDisplayMode,
    SplatUpdateLightFactor,
    SplatUpdateShowWaterMark,
    StopAutoRotate,
    TraverseDisposeAndClear,
    UpdateAllMarkByMeterScale,
    Utils_Dispose,
    ViewerCheckNeedUpdate,
    ViewerSetPointcloudMode,
    OnSetWaterMark,
    GetCachedWaterMark,
    MetaSaveWatermark,
    AddFlyPosition,
    TweenFly,
    ClearFlyPosition,
    TweenFlyDisable,
    GetScene,
    OnViewerBeforeUpdate,
    GetOptions,
    GetControls,
    GetCanvas,
    GetRenderer,
    GetCamera,
    ViewerNeedUpdate,
    MetaMarkRemoveData,
    PrintInfo,
    GetCameraInfo,
    GetSplatMesh,
    FlySavePositions,
} from '../events/EventConstants';
import { SplatMesh } from '../meshs/splatmesh/SplatMesh';
import { ModelOptions } from '../modeldata/ModelOptions';
import { Events } from '../events/Events';
import { setupControlPlane } from '../meshs/controlplane/SetupControlPlane';
import {
    copyGsViewerOptions,
    initCamera,
    initCanvas,
    initControls,
    initGsViewerOptions,
    initRenderer,
    initScene,
    setupViewerUtils,
} from '../utils/ViewerUtils';
import { Controls } from '../controls/Controls';
import { Reall3dViewerOptions } from './Reall3dViewerOptions';
import { setupEventListener } from '../events/EventListener';
import { setupRaycaster } from '../raycaster/SetupRaycaster';
import { setupCameraControls } from '../controls/SetupCameraControls';
import { setupFocusMarker } from '../meshs/focusmaker/SetupFocusMarker';
import { SplatMeshOptions } from '../meshs/splatmesh/SplatMeshOptions';
import { setupMark } from '../meshs/mark/SetupMark';
import { setupApi } from '../api/SetupApi';
import { MarkData } from '../meshs/mark/data/MarkData';
import { setupCommonUtils } from '../utils/CommonUtils';
import { setupTween } from '../tween/SetupTween';
import { isMobile, ViewerVersion } from '../utils/consts/GlobalConstants';
import { MetaData } from '../modeldata/ModelData';

/**
 * 高斯渲染器
 */
export class Reall3dViewer {
    private disposed: boolean = false;
    private splatMesh: SplatMesh;
    private events: Events;
    private updateTime: number = 0;

    public needUpdate: boolean = true;

    constructor(opts: Reall3dViewerOptions = {}) {
        console.info('Reall3dViewer', ViewerVersion);
        this.init(initGsViewerOptions(opts));
    }

    private init(opts: Reall3dViewerOptions) {
        opts.position = opts.position ? [...opts.position] : [0, -5, 15];
        opts.lookAt = opts.lookAt ? [...opts.lookAt] : [0, 0, 0];
        opts.lookUp = opts.lookUp ? [...opts.lookUp] : [0, -1, 0];

        const canvas: HTMLCanvasElement = initCanvas(opts);
        const renderer: WebGLRenderer = initRenderer(opts);
        const scene: Scene = initScene(opts);
        initCamera(opts);
        const controls: Controls = initControls(opts);
        controls.target.fromArray(opts.lookAt);

        const events = new Events();
        opts.viewerEvents = events;
        this.events = events;
        const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
        const fire = (key: number, ...args: any): any => events.fire(key, ...args);

        on(GetOptions, () => opts);
        on(GetCanvas, () => canvas);
        on(GetRenderer, () => renderer);
        on(GetScene, () => scene);
        on(GetControls, () => controls);
        on(GetCamera, () => controls.object);
        on(ViewerSetPointcloudMode, (pointMode: boolean) => (opts.pointcloudMode = pointMode));

        const aryUpdaters: any[] = [];
        on(ViewerNeedUpdate, () => {
            this.needUpdate = true;
            // 稍微多点更新
            while (aryUpdaters.length) aryUpdaters.pop().stop = true; // 已有的都停掉
            let oUpdater = { count: 0, stop: false };
            aryUpdaters.push(oUpdater);

            fire(
                RunLoopByTime,
                () => {
                    !this.disposed && (this.needUpdate = true);
                    oUpdater.count++ >= 100 && (oUpdater.stop = true);
                },
                () => !this.disposed && !oUpdater.stop,
                10,
            );
        });

        setupCommonUtils(events);
        setupViewerUtils(events);
        setupApi(events);
        setupCameraControls(events);
        setupMark(events);
        setupEventListener(events);
        setupRaycaster(events);
        setupFocusMarker(events);
        setupTween(events);

        this.splatMesh = new SplatMesh(copyGsViewerOptions(opts));
        on(GetSplatMesh, () => this.splatMesh);
        scene.add(this.splatMesh);
        setupControlPlane(events);

        scene.add(new AmbientLight('#ffffff', 2));
        scene.add(fire(CreateFocusMarkerMesh));
        renderer.setAnimationLoop(this.update.bind(this));

        on(ViewerCheckNeedUpdate, () => {
            controls.update();
            !this.needUpdate && fire(IsCameraChangedNeedUpdate) && fire(ViewerNeedUpdate);
        });
        on(OnViewerBeforeUpdate, () => fire(KeyActionCheckAndExecute), true);
        on(OnViewerBeforeUpdate, () => fire(ViewerCheckNeedUpdate), true);
        on(
            OnViewerUpdate,
            () => {
                try {
                    !(this.needUpdate = false) && renderer.render(scene, fire(GetCamera));
                } catch (e) {
                    console.warn(e.message);
                }
            },
            true,
        );
        on(OnViewerAfterUpdate, () => {}, true);
        on(ViewerDispose, () => this.dispose());
        on(PrintInfo, () => console.info(JSON.stringify(fire(GetSplatMesh).meta || {}, null, 2)));

        let watermark: string = '';
        on(OnSetWaterMark, (text: string = '') => {
            watermark = text;
            this.splatMesh.fire(SetGaussianText, watermark, true, false); // 水印文字水平朝向
        });
        on(GetCachedWaterMark, () => watermark);

        fire(Information, { scale: `1 : ${fire(GetOptions).meterScale} m` });

        this.initGsApi();

        !opts.disableDropLocalFile && this.enableDropLocalFile(); // 默认支持拖拽本地文件进行渲染
    }

    private enableDropLocalFile(): void {
        const that = this;
        document.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        document.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            let file = e.dataTransfer.files[0];

            const url: any = URL.createObjectURL(file);
            let format: 'bin' | 'splat' | 'sp20';
            if (file.name.endsWith('.bin')) {
                format = 'bin';
            } else if (file.name.endsWith('.splat')) {
                format = 'splat';
            } else if (file.name.endsWith('.sp20')) {
                format = 'sp20';
            } else {
                return console.error('unknow format!', file.name);
            }

            that.reset({ debugMode: true });
            that.addModel({ url, format });
        });
    }

    /**
     * 刷新
     */
    public update(): void {
        if (this.disposed) return;
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);

        if (Date.now() - this.updateTime > 30) {
            fire(OnViewerBeforeUpdate);
            this.needUpdate && fire(OnViewerUpdate);
            fire(OnViewerAfterUpdate);
        }
    }

    // 开发调试用临时接口
    public fire(n: number, p1?: any, p2?: any): void {
        n === 1 && this.splatMesh.fire(SplatUpdateShowWaterMark, p1); // 显示/隐藏水印
        n === 2 && this.events.fire(AddFlyPosition);
        n === 3 && this.events.fire(TweenFly);
        n === 4 && this.events.fire(ClearFlyPosition);
        n === 5 && this.events.fire(FlySavePositions);
        n === 6 && this.events.fire(MetaMarkSaveData);
        n === 7 && this.events.fire(MetaMarkRemoveData);
    }

    /**
     * 设定或者获取最新配置项
     * @param opts 配置项
     * @returns 最新配置项
     */
    public options(opts?: Reall3dViewerOptions): Reall3dViewerOptions {
        if (this.disposed) return {};
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);
        let splatOpts: SplatMeshOptions;
        const scene: Scene = fire(GetScene);
        scene.traverse((obj: any) => !splatOpts && obj instanceof SplatMesh && (splatOpts = (obj as SplatMesh).options()));

        if (opts) {
            if (opts.autoRotate !== undefined) {
                fire(GetControls).autoRotate = opts.autoRotate;
                fire(GetOptions).autoRotate = opts.autoRotate;
            }
            opts.pointcloudMode !== undefined && fire(SplatSetPointcloudMode, opts.pointcloudMode);
            opts.lightFactor !== undefined && fire(SplatUpdateLightFactor, opts.lightFactor);

            opts.maxRenderCountOfMobile && (fire(GetOptions).maxRenderCountOfMobile = opts.maxRenderCountOfMobile);
            opts.maxRenderCountOfPc && (fire(GetOptions).maxRenderCountOfPc = opts.maxRenderCountOfPc);
            opts.debugMode !== undefined && (fire(GetOptions).debugMode = opts.debugMode);

            opts.markType !== undefined && (fire(GetOptions).markType = opts.markType);
            if (opts.markVisible !== undefined) {
                fire(MarkUpdateVisible, opts.markVisible);
            }
            if (opts.meterScale !== undefined) {
                fire(GetOptions).meterScale = opts.meterScale;
            }
            if (opts.markMode !== undefined) {
                fire(GetOptions).markMode = opts.markMode;
                !opts.markMode && fire(ClearMarkPoint);
                fire(GetControls).autoRotate = fire(GetOptions).autoRotate = false;
            }
        }

        const controls: Controls = fire(GetControls);
        controls.updateByOptions(opts);

        fire(Information, { scale: `1 : ${fire(GetOptions).meterScale} m` });
        return Object.assign({ ...fire(GetOptions) }, splatOpts);
    }

    /**
     * 重置
     */
    public reset(opts: Reall3dViewerOptions = {}): void {
        this.dispose();
        this.disposed = false;
        this.init(initGsViewerOptions(opts));
    }

    /**
     * 光圈过渡切换显示
     * @returns
     */
    public switchDeiplayMode() {
        if (this.disposed) return;
        this.events.fire(SplatSwitchDisplayMode);
    }

    /**
     * 添加场景
     * @param sceneUrl 场景地址
     */
    public addScene(sceneUrl: string) {
        fetch(sceneUrl, { mode: 'cors', credentials: 'omit', cache: 'reload' })
            .then(response => (!response.ok ? {} : response.json()))
            .then((metaData: MetaData) => {
                const opts: Reall3dViewerOptions = { ...metaData, ...(metaData.cameraInfo || {}) };
                opts.bigSceneMode = true;
                this.reset({ ...opts });
                isMobile && (metaData.cameraInfo?.position || metaData.cameraInfo?.lookAt) && this.events.fire(GetControls)._dollyOut(0.75); // 手机适当缩小
                this.splatMesh.meta = metaData;
                for (let i = 0, max = metaData.models.length; i < max; i++) {
                    const modelOpts: ModelOptions = metaData.models[i];
                    this.addModel(modelOpts);
                }
                this.events.fire(OnSetWaterMark, metaData.watermark || '');
            })
            .catch(e => {
                console.error(e.message);
            });
    }

    /**
     * 添加要渲染的高斯模型
     * @param urlOpts 高斯模型链接或选项
     */
    public async addModel(urlOpts: string | ModelOptions): Promise<void> {
        if (this.disposed) return;
        let modelOpts: ModelOptions;
        if (Object.prototype.toString.call(urlOpts) === '[object String]') {
            modelOpts = { url: urlOpts as string };
        } else {
            modelOpts = urlOpts as ModelOptions;
        }
        if (!modelOpts.url) return console.error('model url is empty');

        const opts: Reall3dViewerOptions = this.events.fire(GetOptions);
        if (!opts.bigSceneMode) {
            opts.url = modelOpts.url;
            this.events.fire(SetSmallSceneCameraNotReady);
            await this.events.fire(LoadSmallSceneMetaData);
        }
        this.splatMesh.addModel(modelOpts);
        this.events.fire(GetControls).updateRotateAxis();
    }

    /**
     * 根据需要暴露的接口
     */
    private initGsApi() {
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);

        const switchAutoRotate = () => {
            setTimeout(() => window.focus());
            fire(TweenFlyDisable);
            fire(GetControls).autoRotate = fire(GetOptions).autoRotate = !fire(GetOptions).autoRotate;
        };
        const changePointCloudMode = (pointcloudMode: boolean = true) => {
            setTimeout(() => window.focus());
            pointcloudMode = !!pointcloudMode;
            const opts: Reall3dViewerOptions = fire(GetOptions);
            if (opts.pointcloudMode === pointcloudMode) return;
            opts.bigSceneMode ? fire(SplatSetPointcloudMode, pointcloudMode) : fire(SplatSwitchDisplayMode);
        };
        const showMark = (visible: boolean = true) => {
            setTimeout(() => window.focus());
            fire(MarkUpdateVisible, !!visible);
        };
        const startMark = (markType: number): boolean => {
            setTimeout(() => window.focus());
            const opts: Reall3dViewerOptions = fire(GetOptions);
            if (opts.markMode) return false;

            if (markType === 1) {
                opts.markType = 'point';
            } else if (markType === 2) {
                opts.markType = 'lines';
            } else if (markType === 3) {
                opts.markType = 'plans';
            } else if (markType === 4) {
                opts.markType = 'distance';
            } else {
                return false;
            }

            opts.markMode = true;
            fire(StopAutoRotate);
            return true;
        };
        const deleteMark = async (name: string): Promise<boolean> => {
            setTimeout(() => window.focus());
            if (!name) return false;
            fire(GetMarkFromWeakRef, name)?.dispose();
            fire(ViewerNeedUpdate);
            return await fire(MetaMarkSaveData);
        };
        const updateMark = async (data: MarkData, saveData: boolean = true): Promise<boolean> => {
            fire(UpdateAllMarkByMeterScale, data, saveData);
            fire(GetMarkFromWeakRef, data?.name)?.drawUpdate?.(data, saveData);
            fire(ViewerNeedUpdate);
            if (saveData) {
                setTimeout(() => window.focus());
                return await fire(MetaMarkSaveData);
            }
            return true;
        };
        const showWaterMark = (visible: boolean = true) => {
            setTimeout(() => window.focus());
            fire(SplatUpdateShowWaterMark, !!visible);
        };
        const setWaterMark = (text: string, save: boolean = true) => {
            fire(OnSetWaterMark, text);
            save && fire(MetaSaveWatermark, text);
        };
        window['$api'] = { switchAutoRotate, changePointCloudMode, showMark, startMark, deleteMark, updateMark, showWaterMark, setWaterMark };
    }

    /**
     * 销毁渲染器不再使用
     */
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);

        fire(CommonUtilsDispose);
        fire(Utils_Dispose);
        fire(CSS3DRendererDispose);
        fire(EventListenerDispose);
        fire(GetControls).dispose();
        fire(OnViewerDisposeResetVars);

        fire(TraverseDisposeAndClear, fire(GetScene));

        const renderer: WebGLRenderer = fire(GetRenderer);
        renderer.clear();
        renderer.dispose();

        this.splatMesh = null;
        this.events.clear();
        this.events = null;
    }
}
