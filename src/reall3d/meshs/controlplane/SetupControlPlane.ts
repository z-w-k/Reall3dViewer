// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { DoubleSide, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Quaternion, Vector3 } from 'three';
import { Events } from '../../events/Events';
import {
    ControlPlaneUpdate,
    ControlPlaneSwitchVisible,
    GetCameraLookAt,
    GetCameraLookUp,
    GetControlPlane,
    GetScene,
    ViewerNeedUpdate,
    IsControlPlaneVisible,
} from '../../events/EventConstants';
import { ArrowHelper } from './ArrowHelper';

export function setupControlPlane(events: Events) {
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);

    const planeGeometry = new PlaneGeometry(1, 1);
    planeGeometry.rotateX(-Math.PI / 2);
    const planeMaterial = new MeshBasicMaterial({ color: 0xffffff });
    planeMaterial.transparent = true;
    planeMaterial.opacity = 0.6;
    planeMaterial.depthTest = false;
    planeMaterial.depthWrite = false;
    planeMaterial.side = DoubleSide;
    const planeMesh = new Mesh(planeGeometry, planeMaterial);
    // @ts-ignore
    planeMesh.ignoreIntersect = true;

    const arrowDir = new Vector3(0, -1, 0);
    arrowDir.normalize();
    const arrowOrigin = new Vector3(0, 0, 0);
    const arrowLength = 0.5;
    const arrowRadius = 0.01;
    const arrowColor = 0xffff66; // 0x00dd00;
    const headLength = 0.1;
    const headWidth = 0.03;
    const arrowHelper = new ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowRadius, arrowColor, headLength, headWidth);

    const controlPlane = new Object3D();
    controlPlane.add(planeMesh);
    controlPlane.add(arrowHelper);
    controlPlane.renderOrder = 99999;
    planeMesh.renderOrder = 99999;
    // arrowHelper.renderOrder = 99999;
    controlPlane.visible = false;

    fire(GetScene).add(controlPlane);

    on(GetControlPlane, () => controlPlane);
    on(ControlPlaneSwitchVisible, (visible?: boolean) => {
        fire(ControlPlaneUpdate, true);
        controlPlane.visible = visible === undefined ? !controlPlane.visible : visible;
        fire(ViewerNeedUpdate);
    });
    on(IsControlPlaneVisible, () => controlPlane.visible);

    on(ControlPlaneUpdate, (force: boolean = false) => {
        if (force || controlPlane.visible) {
            const tempQuaternion = new Quaternion();
            const defaultUp = new Vector3(0, -1, 0);
            tempQuaternion.setFromUnitVectors(defaultUp, fire(GetCameraLookUp));
            controlPlane.position.copy(fire(GetCameraLookAt));
            controlPlane.quaternion.copy(tempQuaternion);
        }
    });
}
