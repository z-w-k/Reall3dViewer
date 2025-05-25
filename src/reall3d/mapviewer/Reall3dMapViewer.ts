// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { AmbientLight, Clock, DirectionalLight, EventDispatcher, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { Events } from '../events/Events';
import { Reall3dMapViewerOptions } from './Reall3dMapViewerOptions';
import {
    CountFpsDefault,
    CountFpsReal,
    GetCameraFov,
    GetCameraLookAt,
    GetCameraLookUp,
    GetCameraPosition,
    GetFpsDefault,
    GetFpsReal,
    GetOptions,
    ViewerDispose,
    Information,
    IsDebugMode,
    KeyActionCheckAndExecute,
    MapCreateCamera,
    MapCreateControls,
    MapCreateDirLight,
    MapCreateRenderer,
    MapCreateScene,
    OnViewerAfterUpdate,
    OnViewerBeforeUpdate,
    OnViewerUpdate,
    Vector3ToString,
    MapSortSplatMeshRenderOrder,
    MapSceneTraverseDispose,
    CSS3DRendererDispose,
    GetCSS3DRenderer,
} from '../events/EventConstants';
import { initMapViewerOptions, initTileMap, setupMapUtils } from './utils/MapUtils';
import { setupCommonUtils } from '../utils/CommonUtils';
import { setupMapEventListener } from './events/MapEventListener';
import { setupApi } from '../api/SetupApi';
import { setupRaycaster } from '../raycaster/SetupRaycaster';
import { setupMark } from '../meshs/mark/SetupMark';
import { CSS3DRenderer } from 'three/examples/jsm/Addons.js';
import { WarpSplatMesh } from './warpsplatmesh/WarpSplatMesh';
import { ViewerVersion } from '../utils/consts/GlobalConstants';
import * as tt from '@gotoeasy/three-tile';

/**
 * 地图渲染器
 */
export class Reall3dMapViewer extends EventDispatcher<tt.plugin.GLViewerEventMap> {
    public scene: Scene;
    public renderer: WebGLRenderer;
    public camera: PerspectiveCamera;
    public controls: MapControls;
    public ambLight: AmbientLight;
    public dirLight: DirectionalLight;
    public container: HTMLElement;
    public tileMap: tt.TileMap;

    private clock: Clock = new Clock();
    private updateTime: number = 0;
    private events: Events;
    private disposed: boolean = false;

    constructor(options: Reall3dMapViewerOptions = {}) {
        console.info('Reall3dMapViewer', ViewerVersion);
        super();

        const that = this;
        const events = new Events();
        that.events = events;
        const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
        const fire = (key: number, ...args: any): any => events.fire(key, ...args);

        that.tileMap = initTileMap();
        const opts: Reall3dMapViewerOptions = initMapViewerOptions(options);
        on(GetOptions, () => opts);

        setupCommonUtils(events);
        setupApi(events);
        setupMapUtils(events);
        setupRaycaster(events);
        setupMark(events);

        that.container = opts.root as HTMLElement;
        that.renderer = fire(MapCreateRenderer);
        that.scene = fire(MapCreateScene);
        that.camera = fire(MapCreateCamera);
        that.controls = fire(MapCreateControls);
        that.ambLight = new AmbientLight(0xffffff, 1);
        that.scene.add(that.ambLight);
        that.dirLight = fire(MapCreateDirLight);
        that.scene.add(that.dirLight);
        that.scene.add(that.tileMap);
        that.container.appendChild(that.renderer.domElement);
        window.addEventListener('resize', that.resize.bind(that));
        that.resize();
        that.renderer.setAnimationLoop(that.animate.bind(that));

        setupMapEventListener(events);

        on(ViewerDispose, () => that.dispose());

        on(
            OnViewerBeforeUpdate,
            () => {
                fire(CountFpsReal);
                that.controls.update();
                fire(MapSortSplatMeshRenderOrder);
                fire(KeyActionCheckAndExecute);
            },
            true,
        );
        on(
            OnViewerAfterUpdate,
            () => {
                that.dispatchEvent({ type: 'update', delta: that.clock.getDelta() });
                that.updateTime = Date.now();

                fire(IsDebugMode) &&
                    fire(Information, {
                        fps: fire(GetFpsDefault),
                        realFps: fire(GetFpsReal),
                        fov: fire(GetCameraFov),
                        position: fire(Vector3ToString, fire(GetCameraPosition)),
                        lookAt: fire(Vector3ToString, fire(GetCameraLookAt)),
                        lookUp: fire(Vector3ToString, fire(GetCameraLookUp)),
                    });
            },
            true,
        );

        on(
            OnViewerUpdate,
            () => {
                that.tileMap.update(that.camera);
                try {
                    that.renderer.render(that.scene, that.camera);
                } catch (e) {
                    console.warn(e.message);
                }
            },
            true,
        );
    }

    public addScene(indexUrl: string) {
        const that = this;
        const fire = (key: number, ...args: any): any => that.events.fire(key, ...args);
        fetch(indexUrl, { mode: 'cors', credentials: 'omit', cache: 'reload' })
            .then(response => (!response.ok ? {} : response.json()))
            .then((data: any) => {
                if (data.lookAt?.world) {
                    that.controls.target.set(data.lookAt.world.x, data.lookAt.world.y, data.lookAt.world.z);
                } else if (data.lookAt?.geo) {
                    const geo = new Vector3(data.lookAt.geo.lon, data.lookAt.geo.lat, data.lookAt.geo.height);
                    const target = that.tileMap.geo2world(geo);
                    that.controls.target.copy(target);
                }
                if (data.position?.world) {
                    that.controls.object.position.copy(data.position.world);
                } else if (data.position?.geo) {
                    const geo = new Vector3(data.position.geo.lon, data.position.geo.lat, data.position.geo.height);
                    const position = that.tileMap.geo2world(geo);
                    that.controls.object.position.copy(position);
                }
                const set = new Set();
                for (let url of data.scenes) {
                    if (!set.has(url)) {
                        new WarpSplatMesh(url, that);
                        set.add(url);
                    }
                }
            })
            .catch(e => {
                console.error(e.message);
            });
    }

    private resize() {
        const that = this;
        if (that.disposed) return;
        const width = that.container.clientWidth;
        const height = that.container.clientHeight;
        that.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        that.renderer.setSize(width, height);
        that.camera.aspect = width / height;
        that.camera.updateProjectionMatrix();
        const cSS3DRenderer: CSS3DRenderer = that.events.fire(GetCSS3DRenderer);
        cSS3DRenderer.setSize(width, height);
    }

    private animate() {
        const that = this;
        const fire = (key: number, ...args: any): any => that.events.fire(key, ...args);
        fire(CountFpsDefault);
        if (Date.now() - that.updateTime > 30) {
            fire(OnViewerBeforeUpdate);
            fire(OnViewerUpdate);
            fire(OnViewerAfterUpdate);
        }
    }

    public dispose(): void {
        const that = this;
        if (that.disposed) return;
        that.disposed = true;

        const canvas = that.renderer.domElement;

        that.events.fire(CSS3DRendererDispose);
        that.events.fire(MapSceneTraverseDispose);
        that.renderer.clear();
        that.renderer.dispose();
        that.events.clear();

        that.scene = null;
        that.renderer = null;
        that.camera = null;
        that.controls = null;
        that.ambLight = null;
        that.dirLight = null;
        that.container.removeChild(canvas);
        that.container.classList.add('hidden');
        that.container = null;
        that.clock = null;
        that.events = null;
        that.tileMap = null;
    }
}
