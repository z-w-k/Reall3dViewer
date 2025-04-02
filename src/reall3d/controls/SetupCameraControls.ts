// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { GetCameraFov, IsSmallSceneCameraReady, OnViewerDisposeResetVars, SetSmallSceneCameraNotReady } from './../events/EventConstants';
import {
    GetCameraInfo,
    GetCameraLookAt,
    GetCameraLookUp,
    GetCameraPosition,
    GetControls,
    ControlsUpdate,
    ControlsUpdateRotateAxis,
    IsCameraChangedNeedUpdate,
    CameraSetLookAt,
    FocusMarkerMeshUpdate,
    RunLoopByFrame,
    SetCameraInfo,
    ControlPlaneUpdate,
    GetOptions,
} from '../events/EventConstants';
import { PerspectiveCamera, Vector3 } from 'three';
import { Events } from '../events/Events';
import { GetCamera } from '../events/EventConstants';
import { Controls } from './Controls';
import { isMobile } from '../utils/consts/GlobalConstants';
import { MetaData } from '../modeldata/ModelData';

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

    let cameraReady: boolean = false;
    on(IsSmallSceneCameraReady, (): boolean => fire(GetOptions).bigSceneMode || cameraReady);
    on(SetSmallSceneCameraNotReady, (): boolean => (cameraReady = false));

    let pcCameraInfo: CameraInfo;
    on(SetCameraInfo, (metaData?: MetaData) => {
        pcCameraInfo = metaData?.cameraInfo;
        if (pcCameraInfo) {
            // 忽略 fov,near,far,aspect 参数
            const controls: Controls = fire(GetControls);
            controls.object.position.fromArray(pcCameraInfo.position);
            controls.object.up.fromArray(pcCameraInfo.lookUp);
            controls.target.fromArray(pcCameraInfo.lookAt);

            // @ts-ignore
            isMobile && controls._dollyOut(0.75); // 手机适当缩小

            controls.updateRotateAxis();
        }
        cameraReady = true;
    });
    on(
        OnViewerDisposeResetVars,
        () => {
            cameraReady = false;
            pcCameraInfo = undefined;
        },
        true,
    );

    on(ControlsUpdate, () => fire(GetControls).update());
    on(ControlsUpdateRotateAxis, () => fire(GetControls).updateRotateAxis());

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
