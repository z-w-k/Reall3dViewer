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
    GetTileMap,
    OnViewerAfterUpdate,
    OnViewerBeforeUpdate,
    OnViewerUpdate,
    Vector3ToString,
    MapSortSplatMeshRenderOrder,
    MapSceneTraverseDispose,
    CSS3DRendererDispose,
    GetCSS3DRenderer,
    Geo2World,
} from '../events/EventConstants';
import { initMapViewerOptions, setupMapUtils } from '../utils/MapUtils';
import { setupCommonUtils } from '../utils/CommonUtils';
import { setupMapEventListener } from '../events/MapEventListener';
import { setupApi } from '../api/SetupApi';
import { setupRaycaster } from '../raycaster/SetupRaycaster';
import { setupMark } from '../meshs/mark/SetupMark';
import { CSS3DRenderer } from 'three/examples/jsm/Addons.js';
import { WarpMesh } from '../meshs/warpmesh/WarpMesh';
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

    private clock: Clock = new Clock();
    private updateTime: number = 0;
    private events: Events;
    private disposed: boolean = false;

    constructor(container: HTMLElement | string = '#gsviewer', options: Reall3dMapViewerOptions = {}) {
        console.info('Reall3dMapViewer', ViewerVersion);
        super();

        const events = new Events();
        this.events = events;
        const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
        const fire = (key: number, ...args: any): any => events.fire(key, ...args);

        const opts: Reall3dMapViewerOptions = initMapViewerOptions(options);
        on(GetOptions, () => opts);
        on(GetTileMap, () => opts.tileMap);

        setupCommonUtils(events);
        setupApi(events);
        setupMapUtils(events);
        setupRaycaster(events);
        setupMark(events);

        const el = opts.root;
        if (el instanceof HTMLElement) {
            this.container = el;
            this.renderer = fire(MapCreateRenderer);
            this.scene = fire(MapCreateScene);
            this.camera = fire(MapCreateCamera);
            this.controls = fire(MapCreateControls);
            this.ambLight = new AmbientLight(0xffffff, 1);
            this.scene.add(this.ambLight);
            this.dirLight = fire(MapCreateDirLight);
            this.scene.add(this.dirLight);
            this.scene.add(opts.tileMap);
            this.container.appendChild(this.renderer.domElement);
            window.addEventListener('resize', this.resize.bind(this));
            this.resize();
            this.renderer.setAnimationLoop(this.animate.bind(this));
        } else {
            throw `${container} not found!}`;
        }

        setupMapEventListener(events);

        on(Geo2World, (wgs84: number[]) => opts.tileMap.geo2world(new Vector3().fromArray(wgs84)));
        on(ViewerDispose, () => this.dispose());

        on(
            OnViewerBeforeUpdate,
            () => {
                fire(CountFpsReal);
                this.controls.update();
                fire(MapSortSplatMeshRenderOrder);
                fire(KeyActionCheckAndExecute);
            },
            true,
        );
        on(
            OnViewerAfterUpdate,
            () => {
                this.dispatchEvent({ type: 'update', delta: this.clock.getDelta() });
                this.updateTime = Date.now();

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
                opts.tileMap.update(this.camera);
                try {
                    this.renderer.render(this.scene, this.camera);
                } catch (e) {
                    console.warn(e.message);
                }
            },
            true,
        );
    }

    public addScene(indexUrl: string) {
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);
        fetch(indexUrl, { mode: 'cors', credentials: 'omit', cache: 'reload' })
            .then(response => (!response.ok ? {} : response.json()))
            .then((data: any) => {
                if (data.lookAt?.world) {
                    this.controls.target.set(data.lookAt.world.x, data.lookAt.world.y, data.lookAt.world.z);
                } else if (data.lookAt?.geo) {
                    const geo = new Vector3(data.lookAt.geo.lon, data.lookAt.geo.lat, data.lookAt.geo.height);
                    const opts: Reall3dMapViewerOptions = fire(GetOptions);
                    const target = opts.tileMap.geo2world(geo);
                    this.controls.target.copy(target);
                }
                if (data.position?.world) {
                    this.controls.object.position.copy(data.position.world);
                } else if (data.position?.geo) {
                    const geo = new Vector3(data.position.geo.lon, data.position.geo.lat, data.position.geo.height);
                    const opts: Reall3dMapViewerOptions = fire(GetOptions);
                    const position = opts.tileMap.geo2world(geo);
                    this.controls.object.position.copy(position);
                }
                const set = new Set();
                const { renderer, scene, controls, events } = this;
                for (let url of data.scenes) {
                    if (!set.has(url)) {
                        new WarpMesh(url, renderer, scene, controls, events);
                        set.add(url);
                    }
                }
            })
            .catch(e => {
                console.error(e.message);
            });
    }

    private resize() {
        if (this.disposed) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        const cSS3DRenderer: CSS3DRenderer = this.events.fire(GetCSS3DRenderer);
        cSS3DRenderer.setSize(width, height);
    }

    private animate() {
        const fire = (key: number, ...args: any): any => this.events.fire(key, ...args);

        fire(CountFpsDefault);
        if (Date.now() - this.updateTime > 30) {
            fire(OnViewerBeforeUpdate);
            fire(OnViewerUpdate);
            fire(OnViewerAfterUpdate);
        }
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;

        this.events.fire(CSS3DRendererDispose);
        this.events.fire(MapSceneTraverseDispose);
        this.renderer.clear();
        this.renderer.dispose();
        this.events.clear();

        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        this.ambLight = null;
        this.dirLight = null;
        this.container = null;
        this.clock = null;
        this.events = null;
    }
}
