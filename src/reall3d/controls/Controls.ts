// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Camera, PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initCanvas } from '../utils/ViewerUtils';
import { Reall3dViewerOptions } from '../viewer/Reall3dViewerOptions';

/**
 * 旋转控制器
 */
export class Controls extends OrbitControls {
    constructor(opts: Reall3dViewerOptions) {
        const canvas: HTMLCanvasElement = initCanvas(opts);
        const camera: Camera = opts.camera;
        super(camera, canvas);

        const that = this;
        that.enableDamping = opts.enableDamping;
        that.dampingFactor = 0.1;
        that.rotateSpeed = 0.4;
        that.autoRotate = opts.autoRotate;
        that.enableZoom = opts.enableZoom;
        that.enableRotate = opts.enableRotate;
        that.enablePan = opts.enablePan;

        // navigator.userAgent.includes('Mobi') && (that.maxPolarAngle = Math.PI / 2); // 手机上翻限制到水平角度
    }

    public updateByOptions(opts: Reall3dViewerOptions) {
        if (!opts) return;
        const that = this;
        opts.enableDamping !== undefined && (that.enableDamping = opts.enableDamping);
        opts.autoRotate !== undefined && (that.autoRotate = opts.autoRotate);
        opts.enableZoom !== undefined && (that.enableZoom = opts.enableZoom);
        opts.enableRotate !== undefined && (that.enableRotate = opts.enableRotate);
        opts.enablePan !== undefined && (that.enablePan = opts.enablePan);

        opts.fov !== undefined && ((that.object as PerspectiveCamera).fov = opts.fov);
        opts.near !== undefined && ((that.object as PerspectiveCamera).near = opts.near);
        opts.far !== undefined && ((that.object as PerspectiveCamera).far = opts.far);
        opts.position && that.object.position.fromArray(opts.position);
        opts.lookAt && that.target.fromArray(opts.lookAt);
        opts.lookUp && that.object.up.fromArray(opts.lookUp);
        (opts.fov || opts.near || opts.far || opts.position || opts.lookAt || opts.lookUp) && that.update();
    }

    /**
     * 更新旋转轴
     */
    public updateRotateAxis() {
        // @ts-ignore
        this._quat.setFromUnitVectors(this.object.up, new Vector3(0, 1, 0));
        // @ts-ignore
        this._quatInverse = this._quat.clone().invert();
    }
}
