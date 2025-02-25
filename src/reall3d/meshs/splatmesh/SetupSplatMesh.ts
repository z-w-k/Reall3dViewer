// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { GetCamera, OnRenderDataUpdateDone } from './../../events/EventConstants';
import {
    BufferAttribute,
    DataTexture,
    DoubleSide,
    DynamicDrawUsage,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    Mesh,
    NormalBlending,
    PerspectiveCamera,
    RGBAIntegerFormat,
    ShaderMaterial,
    UnsignedIntType,
    Vector2,
    Vector4,
    WebGLProgramParametersWithUniforms,
} from 'three';
import { Events } from '../../events/Events';
import {
    GetSplatActivePoints,
    NotifyViewerNeedUpdate,
    SplatUpdateViewport,
    GetSplatMaterial,
    CreateSplatGeometry,
    CreateSplatMaterial,
    CreateSplatUniforms,
    SplatUpdateFocal,
    SplatUpdateSplatIndex,
    GetWorker,
    GetCanvasSize,
    Information,
    GetSplatGeometry,
    CreateSplatMesh,
    GetOptions,
    SplatMeshDispose,
    SplatGeometryDispose,
    SplatMaterialDispose,
    GetMaxRenderCount,
    SplatTextureReady,
    SplatUpdateTexture,
    SplatUpdateUsingIndex,
    SplatUpdatePointMode,
    SplatUpdateBigSceneMode,
    SplatUpdateLightFactor,
    SplatUpdateTopY,
    SplatUpdateCurrentVisibleRadius,
    SplatUpdateCurrentLightRadius,
    IsBigSceneMode,
    SplatMeshSwitchDisplayMode,
    RunLoopByFrame,
    IsPointcloudMode,
    SplatMeshCycleZoom,
    IsSmallSceneRenderDataReady,
    OnTextureReadySplatCount,
    SplatUpdateMarkPoint,
    MarkUpdateVisible,
    IsSmallSceneCameraReady,
    SplatUpdatePerformanceNow,
    SplatUpdateShowWaterMark,
    TweenFlyOnce,
    SplatUpdateDebugEffect,
} from '../../events/EventConstants';
import { SplatMeshOptions } from './SplatMeshOptions';
import {
    getSplatFragmentShader,
    getSplatVertexShader,
    VarBigSceneMode,
    VarCurrentLightRadius,
    VarCurrentVisibleRadius,
    VarDebugEffect,
    VarFocal,
    VarLightFactor,
    VarMarkPoint,
    VarPerformanceNow,
    VarPointMode,
    VarShowWaterMark,
    VarSplatIndex,
    VarSplatTexture0,
    VarSplatTexture1,
    VarTopY,
    VarUsingIndex,
    VarViewport,
    VarWaterMarkColor,
} from '../../internal/Index';
import {
    WkActivePoints,
    WkCurrentMaxRadius,
    WkUploadTextureVersion,
    WkIndex,
    WkMaxRadius,
    WkModelSplatCount,
    WkRenderSplatCount,
    WkSortTime,
    WkSplatIndex,
    WkTexdata,
    WkTextureReady,
    WkTopY,
    WkVersion,
    WkVisibleSplatCount,
    WkSortStartTime,
} from '../../utils/consts/Index';

export function setupSplatMesh(events: Events) {
    let disposed = false;
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);

    const MaxSplatCount = fire(GetMaxRenderCount) + 10240; // 加上预留的水印数
    const texwidth = 1024 * 2;
    const texheight = Math.ceil((2 * MaxSplatCount) / texwidth);

    let maxRadius: number = 0;
    let currentMaxRadius: number = 0;
    const arySwitchProcess: any[] = [];

    let activePoints: Float32Array = new Float32Array(0);
    on(GetSplatActivePoints, () => activePoints);

    on(CreateSplatGeometry, () => {
        const baseGeometry = new InstancedBufferGeometry();
        baseGeometry.setIndex([0, 1, 2, 0, 2, 3]);
        const positionsArray = new Float32Array(4 * 3);
        const positions = new BufferAttribute(positionsArray, 3);
        baseGeometry.setAttribute('position', positions);
        positions.setXYZ(0, -2.0, -2.0, 0.0);
        positions.setXYZ(1, -2.0, 2.0, 0.0);
        positions.setXYZ(2, 2.0, 2.0, 0.0);
        positions.setXYZ(3, 2.0, -2.0, 0.0);
        positions.needsUpdate = true;

        let geometry = new InstancedBufferGeometry().copy(baseGeometry);

        const indexArray = new Uint32Array(MaxSplatCount);
        const indexAttribute = new InstancedBufferAttribute(indexArray, 1, false);
        indexAttribute.setUsage(DynamicDrawUsage);
        indexAttribute.needsUpdate = true;
        geometry.setAttribute(VarSplatIndex, indexAttribute);
        geometry.instanceCount = 0;

        on(SplatUpdateSplatIndex, (datas: Uint32Array, index: number, sortTime: number, sortStartTime: number) => {
            fire(SplatUpdateUsingIndex, index);
            indexArray.set(datas, 0);
            indexAttribute.clearUpdateRanges();
            indexAttribute.addUpdateRange(0, datas.length);
            indexAttribute.needsUpdate = true;
            geometry.instanceCount = datas.length;
            fire(NotifyViewerNeedUpdate);
            fire(Information, { sortTime: `${sortTime}` });
        });

        on(GetSplatGeometry, () => geometry);
        on(SplatGeometryDispose, () => {
            indexAttribute.array = null;
            geometry.dispose();
        });

        return geometry;
    });

    on(CreateSplatMaterial, () => {
        const material: ShaderMaterial = new ShaderMaterial({
            uniforms: fire(CreateSplatUniforms),
            vertexShader: getSplatVertexShader(),
            fragmentShader: getSplatFragmentShader(),
            transparent: true,
            alphaTest: 1.0,
            blending: NormalBlending,
            depthTest: true, // 是否启用深度测试。深度测试用于确保只有离相机更近的物体才会被渲染
            depthWrite: false, // 是否将深度值写入深度缓冲区
            side: DoubleSide,
        });

        const dataArray0 = new Uint32Array(texwidth * texheight * 4);
        let dataTexture0 = new DataTexture(dataArray0, texwidth, texheight, RGBAIntegerFormat, UnsignedIntType);
        dataTexture0.internalFormat = 'RGBA32UI';
        dataTexture0.needsUpdate = true;
        material.uniforms[VarSplatTexture0].value = dataTexture0;
        const texheight1 = fire(IsBigSceneMode) ? texheight : 1;
        const dataArray1 = new Uint32Array(texwidth * texheight1 * 4);
        let dataTexture1 = new DataTexture(dataArray1, texwidth, texheight1, RGBAIntegerFormat, UnsignedIntType);
        dataTexture1.internalFormat = 'RGBA32UI';
        dataTexture1.needsUpdate = true;
        material.uniforms[VarSplatTexture1].value = dataTexture1;
        material.needsUpdate = true;

        let isLastEmpty: boolean = false;
        on(SplatUpdateTexture, (datas: Uint32Array, index: number, version: number, renderSplatCount: number) => {
            if (!fire(IsBigSceneMode)) {
                if (isLastEmpty && !renderSplatCount) return; // 小场景，不要重复提交空数据
                isLastEmpty = !renderSplatCount;
            }

            const dataArray = new Uint32Array(texwidth * texheight * 4);
            dataArray.set(datas, 0);
            const dataTexture = new DataTexture(dataArray, texwidth, texheight, RGBAIntegerFormat, UnsignedIntType);
            let start = Date.now();
            dataTexture.onUpdate = () => {
                fire(SplatTextureReady, index, version, renderSplatCount);
                fire(OnTextureReadySplatCount, renderSplatCount);
                fire(Information, { updateSceneData: `${Date.now() - start}` });
            };
            dataTexture.internalFormat = 'RGBA32UI';
            dataTexture.needsUpdate = true;
            if (index) {
                material.uniforms[VarSplatTexture1].value = dataTexture;
                dataTexture1 = dataTexture;
            } else {
                material.uniforms[VarSplatTexture0].value = dataTexture;
                dataTexture0 = dataTexture;
            }

            material.needsUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });

        on(GetSplatMaterial, () => material);

        on(SplatUpdateFocal, () => {
            const camera: PerspectiveCamera = fire(GetCamera);
            const { width, height } = fire(GetCanvasSize);
            const fx = Math.abs(camera.projectionMatrix.elements[0]) * 0.5 * width;
            const fy = Math.abs(camera.projectionMatrix.elements[5]) * 0.5 * height;
            const material: ShaderMaterial = fire(GetSplatMaterial);
            material.uniforms[VarFocal].value.set(fx, fy);
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdateViewport, () => {
            const { width, height } = fire(GetCanvasSize);
            material.uniforms[VarViewport].value.set(width, height);
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdateUsingIndex, (index: number) => {
            material.uniforms[VarUsingIndex].value = index;
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdatePointMode, (isPointcloudMode: boolean) => {
            const opts: SplatMeshOptions = fire(GetOptions);
            isPointcloudMode === undefined && (isPointcloudMode = !opts.pointcloudMode);
            material.uniforms[VarPointMode].value = isPointcloudMode ? 1 : 0;
            material.uniformsNeedUpdate = true;
            opts.pointcloudMode = isPointcloudMode;
            fire(NotifyViewerNeedUpdate);
            opts.viewerEvents && (opts.viewerEvents.fire(GetOptions).pointcloudMode = isPointcloudMode);
        });
        on(SplatUpdateBigSceneMode, (isbigSceneMode: boolean) => {
            material.uniforms[VarBigSceneMode].value = isbigSceneMode ? 1 : 0;
            material.uniformsNeedUpdate = true;
            const opts: SplatMeshOptions = fire(GetOptions);
            opts.bigSceneMode = isbigSceneMode;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdateLightFactor, (value: number) => {
            material.uniforms[VarLightFactor].value = value;
            material.uniformsNeedUpdate = true;
            const opts: SplatMeshOptions = fire(GetOptions);
            opts.lightFactor = value;
            fire(NotifyViewerNeedUpdate);
        });

        let initTopY: boolean = false;
        on(SplatUpdateTopY, (value: number) => {
            if (fire(IsBigSceneMode) || initTopY) return;
            initTopY = true;
            material.uniforms[VarTopY].value = value;
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdateCurrentVisibleRadius, (value: number) => {
            material.uniforms[VarCurrentVisibleRadius].value = value;
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdateCurrentLightRadius, (value: number) => {
            material.uniforms[VarCurrentLightRadius].value = value;
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdateMarkPoint, (x: number, y: number, z: number, isMark: boolean) => {
            material.uniforms[VarMarkPoint].value = [x, y, z, isMark ? 1 : -1];
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdateShowWaterMark, (show: boolean = true) => {
            material.uniforms[VarShowWaterMark].value = !!show ? 1 : 0;
            material.uniformsNeedUpdate = true;
            fire(NotifyViewerNeedUpdate);
        });
        on(SplatUpdatePerformanceNow, (value: number) => {
            material.uniforms[VarPerformanceNow].value = value;
            material.uniformsNeedUpdate = true;
        });
        on(SplatUpdateDebugEffect, (value: number) => {
            material.uniforms[VarDebugEffect].value = value;
            material.uniformsNeedUpdate = true;
        });
        on(SplatMaterialDispose, () => {
            material.dispose();
            dataTexture0 && dataTexture0.dispose();
            dataTexture1 && dataTexture1.dispose();
        });

        return material;
    });

    on(CreateSplatMesh, () => {
        const mesh = new Mesh(fire(CreateSplatGeometry), fire(CreateSplatMaterial));
        fire(SplatUpdateFocal);
        fire(SplatUpdateViewport);
        fire(SplatUpdateBigSceneMode, fire(IsBigSceneMode));
        fire(SplatUpdatePointMode, fire(IsPointcloudMode));
        return mesh;
    });

    function resize() {
        fire(SplatUpdateFocal);
        fire(SplatUpdateViewport);
    }
    window.addEventListener('resize', resize);

    on(SplatMeshDispose, () => {
        disposed = true;
        window.removeEventListener('resize', resize);
        fire(SplatGeometryDispose);
        fire(SplatMaterialDispose);
    });

    // 小场景圆圈扩大渐进渲染
    on(SplatMeshCycleZoom, async () => {
        if (fire(IsBigSceneMode)) return; // 大场景模式不支持

        let stepRate = 0.01;
        let currentVisibleRadius = 0.01;

        let stop = false;
        let startTime: number = 0;
        fire(SplatUpdateCurrentVisibleRadius, currentVisibleRadius);

        fire(
            RunLoopByFrame,
            () => {
                if (disposed || currentMaxRadius <= currentVisibleRadius) return;

                currentVisibleRadius += (currentMaxRadius - currentVisibleRadius) * stepRate;
                fire(SplatUpdateCurrentVisibleRadius, currentVisibleRadius);

                let isDataAllReay = fire(IsSmallSceneRenderDataReady);
                isDataAllReay && !startTime && (startTime = Date.now());
                let visibleRate = currentVisibleRadius / maxRadius;
                if (isDataAllReay && (visibleRate > 0.9 || Date.now() - startTime > 2500)) {
                    fire(IsPointcloudMode) && fire(SplatMeshSwitchDisplayMode, true);
                    fire(SplatUpdateCurrentVisibleRadius, 0);
                    stop = true;
                } else if (isDataAllReay && visibleRate > 0.7) {
                    stepRate = Math.min(stepRate * 1.2, 0.3);
                } else if (isDataAllReay && visibleRate > 0.5) {
                    stepRate = Math.min(stepRate * 1.2, 0.2);
                } else if (visibleRate > 0.4) {
                    stepRate = Math.min(stepRate * 1.05, 0.1);
                }
            },
            () => !disposed && !stop,
            3,
        );
    });

    // 切换渲染模式（0:正常模式，1:点云模式），相互排挤，最后调用的优先响应
    on(SplatMeshSwitchDisplayMode, (showMark: boolean = false) => {
        if (fire(IsBigSceneMode)) return; // 大场景模式下不响应光圈过渡效果

        while (arySwitchProcess.length) arySwitchProcess.pop().stop = true; // 已有的都停掉
        const opts: SplatMeshOptions = fire(GetOptions);
        const currentLightRadius = maxRadius * 0.001;
        let switchProcess = { currentPointMode: opts.pointcloudMode, stepRate: 0.0015, currentLightRadius, stop: false };
        arySwitchProcess.push(switchProcess);

        fire(
            RunLoopByFrame,
            () => {
                if (disposed) return;
                switchProcess.currentLightRadius += maxRadius * switchProcess.stepRate; // 动态增量
                fire(SplatUpdateCurrentLightRadius, switchProcess.currentLightRadius);

                if (switchProcess.currentLightRadius > maxRadius) {
                    fire(SplatUpdatePointMode, !switchProcess.currentPointMode); // 根据开始时的点云显示模式进行切换
                    fire(SplatUpdateCurrentLightRadius, 0); // 光圈停止
                    switchProcess.stop = true; // 主动完成
                    arySwitchProcess.length === 1 && arySwitchProcess[0] === switchProcess && arySwitchProcess.pop();

                    showMark && fire(GetOptions).viewerEvents?.fire(MarkUpdateVisible);
                    fire(GetOptions).viewerEvents?.fire(TweenFlyOnce);
                } else if (switchProcess.currentLightRadius / maxRadius < 0.4) {
                    switchProcess.stepRate = Math.min(switchProcess.stepRate * 1.02, 0.03); // 前半圈提速并限速
                } else {
                    switchProcess.stepRate *= 1.04; // 后半圈加速
                }
            },
            () => !disposed && !switchProcess.stop,
        );
    });

    on(CreateSplatUniforms, () => {
        return {
            [VarSplatTexture0]: { type: 't', value: null },
            [VarSplatTexture1]: { type: 't', value: null },
            [VarFocal]: { type: 'v2', value: new Vector2() },
            [VarViewport]: { type: 'v2', value: new Vector2() },
            [VarUsingIndex]: { type: 'int', value: 0 },
            [VarPointMode]: { type: 'int', value: 0 },
            [VarDebugEffect]: { type: 'int', value: 1 },
            [VarBigSceneMode]: { type: 'int', value: 0 },
            [VarLightFactor]: { type: 'float', value: 1 },
            [VarTopY]: { type: 'float', value: 0 },
            [VarCurrentVisibleRadius]: { type: 'float', value: 0 },
            [VarCurrentLightRadius]: { type: 'float', value: 0 },
            [VarMarkPoint]: { type: 'v4', value: new Vector4(0, 0, 0, -1) },
            [VarPerformanceNow]: { type: 'float', value: performance.now() },
            [VarWaterMarkColor]: { type: 'v4', value: new Vector4(1, 1, 0, 0.5) },
            [VarShowWaterMark]: { type: 'int', value: 1 },
        };
    });

    const worker: Worker = fire(GetWorker);
    worker.onmessage = e => {
        const data: any = e.data;
        if (data[WkTexdata]) {
            if (!fire(IsBigSceneMode)) {
                currentMaxRadius = data[WkCurrentMaxRadius];
                maxRadius = data[WkMaxRadius] || currentMaxRadius;
                fire(SplatUpdateTopY, data[WkTopY]);
            }
            const renderSplatCount = data[WkRenderSplatCount];
            const visibleSplatCount = data[WkVisibleSplatCount];
            const modelSplatCount = data[WkModelSplatCount];
            fire(SplatUpdateTexture, data[WkTexdata], data[WkIndex], data[WkVersion], renderSplatCount);
            fire(Information, { renderSplatCount, visibleSplatCount, modelSplatCount });
        } else if (data[WkSplatIndex]) {
            if (fire(GetOptions).viewerEvents) {
                if (fire(GetOptions).viewerEvents?.fire(IsSmallSceneCameraReady)) {
                    fire(SplatUpdateSplatIndex, data[WkSplatIndex], data[WkIndex], data[WkSortTime], data[WkSortStartTime]);
                    fire(Information, { renderSplatCount: data[WkRenderSplatCount] });
                }
            } else {
                fire(SplatUpdateSplatIndex, data[WkSplatIndex], data[WkIndex]);
                fire(Information, { renderSplatCount: data[WkRenderSplatCount] });
            }
        } else if (data[WkActivePoints]) {
            activePoints = data[WkActivePoints];
        } else if (data[WkUploadTextureVersion]) {
            fire(OnRenderDataUpdateDone, data[WkUploadTextureVersion]);
        }
    };

    on(SplatTextureReady, (index: number, version: number, renderSplatCount: number) => {
        worker.postMessage({ [WkTextureReady]: true, [WkIndex]: index, [WkVersion]: version, [WkRenderSplatCount]: renderSplatCount });
    });
}
