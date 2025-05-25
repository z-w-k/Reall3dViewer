// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Matrix4, Mesh, Vector3 } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { SetGaussianText } from '../../events/EventConstants';
import { CSS3DSprite } from 'three/examples/jsm/Addons.js';
import { Easing, Tween } from '@tweenjs/tween.js';
import { SplatMesh } from '../../meshs/splatmesh/SplatMesh';
import { SplatMeshOptions } from '../../meshs/splatmesh/SplatMeshOptions';
import { MetaData } from '../../modeldata/ModelData';
import { Reall3dMapViewer } from '../Reall3dMapViewer';

const isMobile = navigator.userAgent.includes('Mobi');

export class WarpSplatMesh extends Mesh {
    public readonly isWarpSplatMesh: boolean = true;
    public meta: MetaData;
    public lastActiveTime: number = Date.now(); // 备用
    public splatMesh: SplatMesh;
    public active: boolean = false;
    private opts: SplatMeshOptions;
    private css3dTag: CSS3DSprite;
    private mapViewer: Reall3dMapViewer;
    private disposed: boolean = false;

    constructor(sceneUrl: string, mapViewer: Reall3dMapViewer) {
        super();
        this.mapViewer = mapViewer;
        this.addScene(sceneUrl);
        this.frustumCulled = false;
    }

    private async addScene(sceneUrl: string) {
        const { renderer, scene, controls, tileMap } = this.mapViewer;
        fetch(sceneUrl, { mode: 'cors', credentials: 'omit', cache: 'reload' })
            .then(response => (!response.ok ? {} : response.json()))
            .then((data: MetaData) => {
                const matrix = new Matrix4();
                if (data.transform) {
                    matrix.fromArray(data.transform);
                } else if (data.WGS84) {
                    const pos = tileMap.geo2world(new Vector3().fromArray(data.WGS84));
                    matrix.makeTranslation(pos.x, pos.y, pos.z);
                }
                const bigSceneMode = data.autoCut && data.autoCut > 1;
                const pointcloudMode = false;
                const depthTest = false;
                const showWatermark = data.showWatermark !== false;
                const opts: SplatMeshOptions = { renderer, scene, controls, pointcloudMode, bigSceneMode, matrix, showWatermark, depthTest };
                opts.maxRenderCountOfMobile ??= opts.bigSceneMode ? 128 * 10240 : 400 * 10000;
                opts.maxRenderCountOfPc ??= opts.bigSceneMode ? 320 * 10000 : 400 * 10000;
                opts.debugMode ??= location.protocol === 'http:' || /^test\./.test(location.host); // 生产环境不开启
                this.opts = opts;
                this.meta = data;
                scene.add(this);
                this.initCSS3DSprite(opts);
                this.applyMatrix4(matrix);
            })
            .catch(e => {
                console.error(e.message);
            });
    }

    private async initCSS3DSprite(opts: SplatMeshOptions) {
        const that = this;
        const tagWarp: HTMLDivElement = document.createElement('div');
        tagWarp.innerHTML = `<div title="${this.meta.name}" style='flex-direction: column;align-items: center;display: flex;pointer-events: auto;margin-bottom: 20px;'>
                               <svg height="20" width="20" style="color:#eeee00;opacity:0.9;"><use href="#svgicon-point3" fill="currentColor" /></svg>
                            </div>`;
        tagWarp.classList.add('splatmesh-point');
        tagWarp.style.position = 'absolute';
        tagWarp.style.borderRadius = '4px';
        tagWarp.style.cursor = 'pointer';
        let tween: Tween = null;
        tagWarp.onclick = () => {
            if (tween) return;
            const target = that.position;
            const controls: MapControls = opts.controls;
            const pos: Vector3 = controls.object.position.clone();
            const distance = isMobile ? 6 : 2; // 相机与目标点的距离
            const cameraToP1 = target.clone().sub(pos).normalize(); // 获取相机到目标点的向量
            const newPos = target.clone().sub(cameraToP1.multiplyScalar(distance)); // 计算新的相机位置

            const pt = { x: pos.x, y: pos.y, z: pos.z, tx: controls.target.x, ty: controls.target.y, tz: controls.target.z };
            const to = { x: newPos.x, y: newPos.y, z: newPos.z, tx: target.x, ty: target.y, tz: target.z };
            tween = new Tween(pt).to(to, 3000);
            tween
                .easing(Easing.Sinusoidal.InOut)
                .start()
                .onUpdate(() => {
                    const y = pt.y < 0.1 ? 0.1 : pt.y;
                    controls.object.position.set(pt.x, y, pt.z);
                    controls.target.set(pt.tx, pt.ty, pt.tz);
                })
                .onComplete(() => {
                    tween = null;
                });
        };
        tagWarp.oncontextmenu = (e: MouseEvent) => e.preventDefault();
        const css3dTag = new CSS3DSprite(tagWarp);
        css3dTag.element.style.pointerEvents = 'none';
        css3dTag.visible = false;
        css3dTag.applyMatrix4(opts.matrix);
        this.css3dTag = css3dTag;
        opts.scene.add(css3dTag);

        this.onBeforeRender = () => {
            tween?.update();

            const MinDistance = isMobile ? 50 : 40;
            const distance = that.position.distanceTo(that.mapViewer.controls.object.position);
            if (distance > MinDistance) {
                this.css3dTag.visible = this.opts.controls.object.position.y > 2;
                let scale = 0.002 * distance;
                css3dTag.scale.set(scale, scale, scale);
                this.css3dTag.visible = true;
                this.splatMesh && (this.splatMesh.visible = false);
            } else {
                if (!this.active) {
                    this.splatMesh && (this.splatMesh.visible = false);
                    let scale = 0.002 * distance;
                    css3dTag.scale.set(scale, scale, scale);
                    this.css3dTag.visible = true;
                    return;
                }

                this.lastActiveTime = Date.now();
                this.css3dTag.visible = false;

                if (this.splatMesh) {
                    this.splatMesh.visible = true;
                } else {
                    const meta = this.meta;
                    const opts: SplatMeshOptions = { ...this.opts };
                    meta.autoCut && (opts.bigSceneMode = true);
                    const splatMesh = new SplatMesh(opts);
                    this.splatMesh = splatMesh;
                    this.opts.scene.add(splatMesh);
                    splatMesh.applyMatrix4(this.opts.matrix);
                    splatMesh.meta = meta;
                    const watermark = meta.watermark || meta.name || ''; // 水印文字
                    meta.showWatermark = meta.showWatermark !== false; // 是否显示水印文字
                    splatMesh.fire(SetGaussianText, watermark, true, false);
                    splatMesh.addModel({ url: this.meta.url }, this.meta);
                }
            }
        };

        this.onAfterRender = () => {
            if (this.splatMesh && (!this.active || Date.now() - this.lastActiveTime > 1 * 60 * 1000)) {
                setTimeout(() => {
                    this.splatMesh?.dispose();
                    this.splatMesh = null;
                }, 5);
            }
        };
    }

    /**
     * 销毁
     */
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;

        this.opts.scene.remove(this.css3dTag);
        this.splatMesh?.dispose();

        this.meta = null;
        this.opts = null;
        this.css3dTag = null;
    }
}
