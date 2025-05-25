// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
import {
    GetCameraInfo,
    GetCameraLookAt,
    GetCameraLookUp,
    GetCameraPosition,
    GetCameraFov,
    GetControls,
    ControlsUpdate,
    ControlsUpdateRotateAxis,
    IsCameraChangedNeedUpdate,
    CameraSetLookAt,
    FocusMarkerMeshUpdate,
    RunLoopByFrame,
    ControlPlaneUpdate,
} from '../events/EventConstants';
import { PerspectiveCamera, Vector3 } from 'three';
import { Events } from '../events/Events';
import { GetCamera } from '../events/EventConstants';
import { CameraControls } from './CameraControls';

/**
 * 相机参数信息
 */
export interface CameraInfo {
    /**
     * 相机视场
     */
    fov?: number;

    /**
     * 相机近截面距离
     */
    near?: number;

    /**
     * 相机远截面距离
     */
    far?: number;

    /**
     * 相机宽高比
     */
    aspect?: number;

    /**
     * 相机位置
     */
    position: number[];

    /**
     * 相机注视点
     */
    lookAt?: number[];

    /**
     * 相机上向量
     */
    lookUp?: number[];
}

export function setupCameraControls(events: Events) {
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);

    on(GetCameraFov, () => fire(GetCamera).fov);
    on(GetCameraPosition, (copy: boolean = false) => (copy ? fire(GetCamera).position.clone() : fire(GetCamera).position));
    on(GetCameraLookAt, (copy: boolean = false) => (copy ? fire(GetControls).target.clone() : fire(GetControls).target));
    on(GetCameraLookUp, (copy: boolean = false) => (copy ? fire(GetCamera).up.clone() : fire(GetCamera).up));
    on(CameraSetLookAt, (target: Vector3, animate: boolean = false) => {
        fire(FocusMarkerMeshUpdate, target);
        if (!animate) {
            fire(GetControls).target.copy(target);
            fire(ControlPlaneUpdate);
            return;
        }

        const start: Vector3 = fire(GetControls).target.clone();
        let alpha = 0;
        fire(
            RunLoopByFrame,
            () => {
                alpha += 0.03;
                fire(GetControls).target.copy(start.clone().lerp(target, alpha));
                fire(ControlPlaneUpdate);
            },
            () => alpha < 1,
        );
    });

    on(GetCameraInfo, (): CameraInfo => {
        let position = fire(GetCameraPosition).toArray();
        let lookUp = fire(GetCameraLookUp).toArray();
        let lookAt = fire(GetCameraLookAt).toArray();
        return { position, lookUp, lookAt };
    });

    on(ControlsUpdate, () => (fire(GetControls) as CameraControls).update());
    on(ControlsUpdateRotateAxis, () => (fire(GetControls) as CameraControls).updateRotateAxis());

    // ---------------------
    const epsilon = 0.01;
    let lastCameraPosition: Vector3 = new Vector3();
    let lastCameraDirection: Vector3 = new Vector3();
    let lastCameraFov: number = 0;
    on(IsCameraChangedNeedUpdate, () => {
        const camera: PerspectiveCamera = fire(GetControls).object;
        const fov = camera.fov;
        const position = camera.position.clone();
        const direction = camera.getWorldDirection(new Vector3());
        if (
            Math.abs(lastCameraFov - fov) < epsilon &&
            Math.abs(position.x - lastCameraPosition.x) < epsilon &&
            Math.abs(position.y - lastCameraPosition.y) < epsilon &&
            Math.abs(position.z - lastCameraPosition.z) < epsilon &&
            Math.abs(direction.x - lastCameraDirection.x) < epsilon &&
            Math.abs(direction.y - lastCameraDirection.y) < epsilon &&
            Math.abs(direction.z - lastCameraDirection.z) < epsilon
        ) {
            return false;
        }
        lastCameraFov = fov;
        lastCameraPosition = position;
        lastCameraDirection = direction;
        return true;
    });
}
