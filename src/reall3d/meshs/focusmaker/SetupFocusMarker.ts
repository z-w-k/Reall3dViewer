// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
import { Color, FrontSide, Matrix4, Mesh, PerspectiveCamera, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from 'three';
import { Events } from '../../events/Events';
import {
    RunLoopByTime,
    ViewerNeedUpdate,
    CreateFocusMarkerMesh,
    FocusMarkerMaterialSetOpacity,
    FocusMarkerMeshAutoDisappear,
    FocusMarkerMeshDispose,
    FocusMarkerMeshUpdate,
    GetCamera,
    GetCanvasSize,
    GetFocusMarkerMaterial,
} from '../../events/EventConstants';
import { getFocusMarkerFragmentShader, getFocusMarkerVertexShader, VarOpacity, VarViewport } from '../../internal/Index';

export class FocusMarkerMesh extends Mesh {
    public readonly ignoreIntersect: boolean = true;
}

export function setupFocusMarker(events: Events) {
    let disposed = false;
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);

    const aryProcessFocus: any[] = [];
    const tempPosition = new Vector3();
    const tempMatrix = new Matrix4();
    const currentFocusPosition = new Vector3();

    on(CreateFocusMarkerMesh, () => {
        const sphereGeometry = new SphereGeometry(0.5, 32, 32);
        const focusMarkerMaterial = buildFocusMarkerMaterial();
        focusMarkerMaterial.depthTest = false;
        focusMarkerMaterial.depthWrite = false;
        focusMarkerMaterial.transparent = true;
        const focusMarkerMesh = new FocusMarkerMesh();
        focusMarkerMesh.copy(new Mesh(sphereGeometry, focusMarkerMaterial));

        const updateFocusMarkerMeshPosition = () => {
            const camera: PerspectiveCamera = fire(GetCamera);
            tempMatrix.copy(camera.matrixWorld).invert();
            tempPosition.copy(currentFocusPosition).applyMatrix4(tempMatrix);
            tempPosition.normalize().multiplyScalar(10);
            tempPosition.applyMatrix4(camera.matrixWorld);
            focusMarkerMesh.position.copy(tempPosition);
        };
        focusMarkerMesh.onBeforeRender = () => updateFocusMarkerMeshPosition();

        on(GetFocusMarkerMaterial, () => focusMarkerMaterial);

        on(FocusMarkerMaterialSetOpacity, (val: number) => {
            if (disposed) return;
            focusMarkerMaterial.uniforms[VarOpacity].value = val;
            val <= 0.01 ? (focusMarkerMesh.visible = false) : (focusMarkerMesh.visible = true);
            focusMarkerMaterial.uniformsNeedUpdate = true;
            fire(ViewerNeedUpdate);
        });

        on(FocusMarkerMeshUpdate, (focusPosition: Vector3) => {
            if (disposed) return;
            currentFocusPosition.copy(focusPosition);
            updateFocusMarkerMeshPosition();

            const { width, height } = fire(GetCanvasSize);
            focusMarkerMaterial.uniforms[VarViewport].value.set(width, height);
            focusMarkerMaterial.uniforms[VarOpacity].value = 1;
            focusMarkerMaterial.uniformsNeedUpdate = true;

            fire(FocusMarkerMeshAutoDisappear);
            fire(ViewerNeedUpdate);
        });

        on(FocusMarkerMeshDispose, () => {
            if (disposed) return;
            disposed = true;
            focusMarkerMaterial.dispose();
            sphereGeometry.dispose();
        });

        focusMarkerMesh.renderOrder = 99999;
        return focusMarkerMesh;
    });

    on(FocusMarkerMeshAutoDisappear, () => {
        while (aryProcessFocus.length) aryProcessFocus.pop().opacity = 0;
        let process = { opacity: 1.0 };
        aryProcessFocus.push(process);

        fire(
            RunLoopByTime,
            () => {
                if (!disposed && process.opacity > 0) {
                    if (process.opacity < 0.2) {
                        process.opacity = 0;
                    } else if (process.opacity > 0.7) {
                        process.opacity = Math.max((process.opacity -= 0.005), 0);
                    } else {
                        process.opacity = Math.max((process.opacity -= 0.1), 0);
                    }
                    fire(FocusMarkerMaterialSetOpacity, process.opacity);
                }
            },
            () => !disposed && process.opacity > 0,
        );
    });
}

function buildFocusMarkerMaterial() {
    const uniforms = {
        [VarViewport]: { type: 'v2', value: new Vector2() },
        [VarOpacity]: { value: 0.0 },
    };

    const material = new ShaderMaterial({
        uniforms: uniforms,
        vertexShader: getFocusMarkerVertexShader(),
        fragmentShader: getFocusMarkerFragmentShader(),
        side: FrontSide,
    });

    return material;
}
