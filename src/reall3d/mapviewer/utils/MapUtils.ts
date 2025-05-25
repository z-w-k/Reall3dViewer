// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Color, DirectionalLight, FogExp2, MathUtils, Matrix4, PerspectiveCamera, Scene, Vector3, Vector4, WebGLRenderer } from 'three';
import {
    GetControls,
    GetOptions,
    MapCreateCamera,
    MapCreateControls,
    GetRenderer,
    GetScene,
    MapCreateRenderer,
    MapCreateScene,
    MapCreateDirLight,
    GetCamera,
    ViewerDispose,
    GetCanvas,
    MapGetSplatMesh,
    MapSplatMeshRotateX,
    MapSplatMeshRotateY,
    MapSplatMeshRotateZ,
    MapSplatMeshMoveX,
    MapSplatMeshMoveY,
    MapSplatMeshMoveZ,
    MapSplatMeshScale,
    MapSplatMeshShowHide,
    MapSplatMeshSaveModelMatrix,
    HttpPostMetaData,
    MapSplatMeshSetPosition,
    CountFpsDefault,
    GetFpsDefault,
    CountFpsReal,
    GetFpsReal,
    IsDebugMode,
    ComputeFps,
    GetCameraFov,
    GetCameraPosition,
    GetCameraLookAt,
    GetCameraLookUp,
    MapSortSplatMeshRenderOrder,
    MapSceneTraverseDispose,
    MapIsWarpSplatMeshVisible,
} from '../../events/EventConstants';
import { Events } from '../../events/Events';
import { Reall3dMapViewerOptions } from '../Reall3dMapViewerOptions';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { SplatMesh } from '../../meshs/splatmesh/SplatMesh';
import { WarpSplatMesh } from '../warpsplatmesh/WarpSplatMesh';
import { isMobile } from '../../utils/consts/GlobalConstants';
import * as tt from '@gotoeasy/three-tile';

export function setupMapUtils(events: Events) {
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);

    const MaxActiveCount: number = isMobile ? 1 : 20;

    const fpsMap: Map<number, any> = new Map();
    const fpsRealMap: Map<number, any> = new Map();
    on(CountFpsDefault, () => fire(IsDebugMode) && fpsMap.set(Date.now(), 1));
    on(GetFpsDefault, () => fire(IsDebugMode) && fire(ComputeFps, fpsMap));
    on(CountFpsReal, () => fire(IsDebugMode) && fpsRealMap.set(Date.now(), 1));
    on(GetFpsReal, () => fire(IsDebugMode) && fire(ComputeFps, fpsRealMap));
    on(ComputeFps, (map: Map<number, any>) => {
        let dels: number[] = [];
        let now: number = Date.now();
        let rs: number = 0;
        for (const key of map.keys()) {
            now - key <= 1000 ? rs++ : dels.push(key);
        }
        dels.forEach(key => map.delete(key));
        return Math.min(rs, 30);
    });

    on(MapGetSplatMesh, () => {
        const scene: Scene = fire(GetScene);
        const camera: PerspectiveCamera = fire(GetCamera);
        const warpMeshs: WarpSplatMesh[] = [];
        scene?.traverse(function (child: any) {
            if (child.isWarpSplatMesh && (child as WarpSplatMesh).splatMesh?.visible) {
                warpMeshs.push(child);
            }
        });

        warpMeshs.sort((a, b) => camera.position.distanceTo(a.position) - camera.position.distanceTo(b.position));
        window['splat'] = warpMeshs[0]?.splatMesh;
        return warpMeshs[0]?.splatMesh;
    });

    on(MapIsWarpSplatMeshVisible, (matrix: Matrix4) => {
        let pos2d: Vector4;
        let clip: number;
        const range: number = 1.1;

        const camera: PerspectiveCamera = fire(GetCamera);
        const viewProjMatrix: Matrix4 = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse).multiply(matrix);

        pos2d = new Vector4(0, 0, 0, 1).applyMatrix4(viewProjMatrix);
        clip = range * pos2d.w;
        if (!(pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip)) {
            return true; // 可见
        }
        return false;
    });

    on(MapSortSplatMeshRenderOrder, () => {
        const scene: Scene = fire(GetScene);
        const camera: PerspectiveCamera = fire(GetCamera);
        const warpMeshs: WarpSplatMesh[] = [];
        scene?.traverse(function (child: any) {
            child.isWarpSplatMesh && warpMeshs.push(child);
        });

        warpMeshs.sort((a, b) => camera.position.distanceTo(a.position) - camera.position.distanceTo(b.position));
        for (let i = 0; i < warpMeshs.length; i++) {
            warpMeshs[i].active = i < MaxActiveCount;
            warpMeshs[i].splatMesh && (warpMeshs[i].splatMesh.renderOrder = 1000 - i);
        }
    });

    on(MapSceneTraverseDispose, () => {
        const scene: Scene = fire(GetScene);
        const objects: any[] = [];
        scene?.traverse((object: any) => objects.push(object));
        objects.forEach((object: any) => {
            if (object.dispose) {
                object.dispose();
            } else {
                object.geometry?.dispose?.();
                object.material && object.material instanceof Array
                    ? object.material.forEach((material: any) => material?.dispose?.())
                    : object.material?.dispose?.();
            }
        });
        scene?.clear();
    });

    on(MapSplatMeshRotateX, (deg: number = 0.1) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && splatMesh.rotateOnAxis(new Vector3(1, 0, 0), MathUtils.degToRad(deg));
    });
    on(MapSplatMeshRotateY, (deg: number = 0.1) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && splatMesh.rotateOnAxis(new Vector3(0, 1, 0), MathUtils.degToRad(deg));
    });
    on(MapSplatMeshRotateZ, (deg: number = 0.1) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && splatMesh.rotateOnAxis(new Vector3(0, 0, 1), MathUtils.degToRad(deg));
    });
    on(MapSplatMeshMoveX, (step: number = 0.01) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && (splatMesh.position.x += step);
    });
    on(MapSplatMeshMoveY, (step: number = 0.01) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && (splatMesh.position.y += step);
    });
    on(MapSplatMeshMoveZ, (step: number = 0.01) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && (splatMesh.position.z += step);
    });
    on(MapSplatMeshSetPosition, (v3: Vector3) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && v3 && splatMesh.position.copy(v3);
        console.info(splatMesh, v3);
    });
    on(MapSplatMeshScale, (step: number = 0.01) => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && splatMesh.visible && splatMesh.scale.set(splatMesh.scale.x + step, splatMesh.scale.y + step, splatMesh.scale.z + step);
    });
    on(MapSplatMeshShowHide, () => {
        const splatMesh: SplatMesh = fire(MapGetSplatMesh);
        splatMesh && (splatMesh.visible = !splatMesh.visible);
    });
    on(MapSplatMeshSaveModelMatrix, async (splatMesh?: SplatMesh) => {
        !splatMesh && (splatMesh = fire(MapGetSplatMesh));
        if (!splatMesh) return;
        const meta = splatMesh.meta || {};
        meta.transform = splatMesh.matrix.toArray();
        return await fire(HttpPostMetaData, JSON.stringify(meta), splatMesh.meta.url);
    });

    on(MapCreateRenderer, () => {
        const opts: Reall3dMapViewerOptions = fire(GetOptions);
        let root: HTMLElement;
        if (opts.root) {
            root = typeof opts.root === 'string' ? document.querySelector(opts.root) || document.querySelector('#gsviewer') : opts.root;
        } else {
            root = document.querySelector('#gsviewer');
        }
        if (!root) {
            root = document.createElement('div');
            root.id = 'gsviewer';
            document.body.appendChild(root);
        }

        const renderer = new WebGLRenderer({
            antialias: false,
            logarithmicDepthBuffer: true,
            stencil: true,
            alpha: true,
            precision: 'highp',
        });
        renderer.setSize(root.clientWidth, root.clientHeight);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

        on(GetRenderer, () => renderer);
        on(GetCanvas, () => renderer.domElement);
        return renderer;
    });

    on(MapCreateScene, () => {
        const scene = new Scene();
        const backColor = 0xdbf0ff;
        scene.background = new Color(backColor);
        scene.fog = new FogExp2(backColor, 0);
        on(GetScene, () => scene);
        return scene;
    });

    on(MapCreateCamera, () => {
        const { position } = fire(GetOptions) as Reall3dMapViewerOptions;
        const camera = new PerspectiveCamera(60, 1, 0.01, 10000);
        position && camera.position.copy(position);
        on(GetCamera, () => camera);
        return camera;
    });

    on(MapCreateControls, () => {
        const fogFactor = 1.0;
        const camera: PerspectiveCamera = fire(GetCamera);
        const scene: Scene = fire(GetScene);
        const opts: Reall3dMapViewerOptions = fire(GetOptions);
        const controls = new MapControls(fire(GetCamera), opts.root as HTMLElement);
        opts.lookAt && controls.target.copy(opts.lookAt);
        controls.screenSpacePanning = false;
        controls.minDistance = 0.1;
        controls.maxDistance = 30000;
        controls.maxPolarAngle = 1.2;
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.zoomToCursor = true;
        controls.minAzimuthAngle = 0;
        controls.maxAzimuthAngle = 0;

        controls.addEventListener('change', () => {
            // camera polar
            const polar = Math.max(controls.getPolarAngle(), 0.1);
            // dist of camera to controls
            const dist = Math.max(controls.getDistance(), 0.1);
            // set zoom speed on dist
            controls.zoomSpeed = Math.max(Math.log(dist), 0) + 0.5;

            // set far and near on dist/polar
            camera.far = MathUtils.clamp((dist / polar) * 8, 100, 50000);
            camera.near = camera.far / 1000;
            camera.updateProjectionMatrix();

            // set fog density on dist/polar
            if (scene.fog instanceof FogExp2) {
                scene.fog.density = (polar / (dist + 5)) * fogFactor * 0.25;
            }

            // limit the max polar on dist
            controls.maxPolarAngle = Math.min(Math.pow(10000 / dist, 4), 1.2);
        });

        on(GetControls, () => controls);

        on(GetCameraFov, () => camera.fov);
        on(GetCameraPosition, (copy: boolean = false) => (copy ? camera.position.clone() : camera.position));
        on(GetCameraLookAt, (copy: boolean = false) => (copy ? controls.target.clone() : controls.target));
        on(GetCameraLookUp, (copy: boolean = false) => (copy ? camera.up.clone() : camera.up));

        return controls;
    });

    on(MapCreateDirLight, () => {
        const { lookAt } = fire(GetOptions) as Reall3dMapViewerOptions;
        const dirLight = new DirectionalLight(0xffffff, 1);
        dirLight.position.set(0, 2e3, 1e3);
        lookAt && dirLight.target.position.copy(lookAt);
        return dirLight;
    });

    window.addEventListener('beforeunload', () => fire(ViewerDispose));
}

export function initMapViewerOptions(options: Reall3dMapViewerOptions): Reall3dMapViewerOptions {
    let { lookAt, position, root = '#map' } = options;

    if (root) {
        root = typeof root === 'string' ? ((document.querySelector(root) || document.querySelector('#map')) as HTMLElement) : root;
    } else {
        root = document.querySelector('#map') as HTMLElement;
    }
    if (!root) {
        root = document.createElement('div');
        root.id = 'map';
        document.querySelector('#gsviewer').appendChild(root);
    }

    const opts: Reall3dMapViewerOptions = { lookAt, position, root };
    opts.debugMode ??= location.protocol === 'http:' || /^test\./.test(location.host); // 生产环境不开启
    return opts;
}

export function initTileMap(): tt.TileMap {
    const TOKEN = '7f8f4f56f3ccda758f9a497e2b981018';
    const tdtImgSource = new tt.plugin.TDTSource({ token: TOKEN, style: 'img_w' });
    const tdtVecSource = new tt.plugin.TDTSource({ token: TOKEN, style: 'cia_w' });
    const tileMap = new tt.TileMap({
        imgSource: location.protocol === 'http:' ? new tt.plugin.BingSource() : [tdtImgSource, tdtVecSource], // 影像数据源
        lon0: 90, // 地图投影中央经线经度
        minLevel: 2, // 最小缩放级别
        maxLevel: 16, // 最大缩放级别
    });
    tileMap.scale.set(10, 10, 10);
    tileMap.rotateX(-Math.PI / 2); // 地图旋转到xz平面
    tileMap.autoUpdate = false;
    return tileMap;
}
