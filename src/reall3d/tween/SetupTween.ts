// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Events } from '../events/Events';
import {
    AddFlyPosition,
    ClearFlyPosition,
    FlySavePositions,
    GetControls,
    GetFlyPositionArray,
    GetFlyPositions,
    GetFlyTargetArray,
    GetOptions,
    GetSplatMesh,
    HttpPostMetaData,
    OnSetFlyPositions,
    OnSetFlyTargets,
    OnViewerAfterUpdate,
    StopAutoRotate,
    TweenFly,
    TweenFlyDisable,
    TweenFlyEnable,
    TweenFlyOnce,
} from '../events/EventConstants';
import { Easing, Tween } from '@tweenjs/tween.js';
import { Controls } from '../controls/Controls';
import { CatmullRomCurve3, Vector3 } from 'three';
import { MetaData } from '../modeldata/ModelData';
export function setupTween(events: Events) {
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);

    const flyPositions: Vector3[] = [];
    const flyTargets: Vector3[] = [];
    let tween: Tween;
    let flyEnable: boolean = false;
    let flyOnceDone: boolean = false;

    on(TweenFlyDisable, () => (flyEnable = false));
    on(TweenFlyEnable, () => (flyEnable = true));
    on(GetFlyPositions, () => flyPositions);
    on(GetFlyPositionArray, () => {
        const rs = [];
        for (let i = 0, max = flyPositions.length; i < max; i++) {
            rs.push(...flyPositions[i].toArray());
        }
        return rs;
    });
    on(GetFlyTargetArray, () => {
        const rs = [];
        for (let i = 0, max = flyTargets.length; i < max; i++) {
            rs.push(...flyTargets[i].toArray());
        }
        return rs;
    });
    on(OnSetFlyPositions, (v3s: number[]) => {
        for (let i = 0, max = (v3s.length / 3) | 0; i < max; i++) {
            flyPositions[i] = new Vector3(v3s[i * 3 + 0], v3s[i * 3 + 1], v3s[i * 3 + 2]);
        }
    });
    on(OnSetFlyTargets, (v3s: number[]) => {
        for (let i = 0, max = (v3s.length / 3) | 0; i < max; i++) {
            flyTargets[i] = new Vector3(v3s[i * 3 + 0], v3s[i * 3 + 1], v3s[i * 3 + 2]);
        }
    });
    on(AddFlyPosition, () => {
        const controls: Controls = fire(GetControls);
        flyPositions.push(controls.object.position.clone());
        flyTargets.push(controls.target.clone());
    });
    on(ClearFlyPosition, () => {
        flyPositions.length = 0;
        flyTargets.length = 0;
    });
    on(FlySavePositions, async () => {
        const meta: MetaData = fire(GetSplatMesh).meta || {};
        if (flyPositions.length) {
            const positions: number[] = [];
            const targets: number[] = [];
            for (let i = 0, max = flyPositions.length; i < max; i++) {
                positions.push(...flyPositions[i].toArray());
                targets.push(...flyTargets[i].toArray());
            }
            meta.flyPositions = positions;
            meta.flyTargets = targets;
        } else {
            delete meta.flyPositions;
            delete meta.flyTargets;
        }
        const metaJson = JSON.stringify(meta, null, 2);

        return await fire(HttpPostMetaData, metaJson, fire(GetOptions).url);
    });

    on(TweenFlyOnce, (idx: number = 0) => {
        if (flyOnceDone) return;
        (flyOnceDone = true) && fire(TweenFly);
    });

    on(TweenFly, (idx: number = 0, force: boolean = true) => {
        force && fire(TweenFlyEnable);
        if (idx < 0 || idx > 100 || !flyEnable) return; // 最多支持100个位置

        const toPos: Vector3 = (fire(GetFlyPositions) || [])[idx];
        if (!toPos) {
            fire(TweenFly, idx + 1, false);
            return;
        }

        fire(StopAutoRotate, false);

        const controls: Controls = fire(GetControls);
        const toTgt: Vector3 = flyTargets[idx] || controls.target.clone();
        const pos: Vector3 = controls.object.position.clone();
        const tgt: Vector3 = controls.target.clone();
        const pt = { ...pos, tx: tgt.x, ty: tgt.y, tz: tgt.z };
        tween = new Tween(pt).to({ x: toPos.x, y: toPos.y, z: toPos.z, tx: toTgt.x, ty: toTgt.y, tz: toTgt.z }, 3000);
        tween
            .delay(200)
            .easing(Easing.Sinusoidal.InOut)
            .start()
            .onUpdate(() => {
                if (flyEnable) {
                    controls.object.position.set(pt.x, pt.y, pt.z);
                    controls.target.set(pt.tx, pt.ty, pt.tz);
                }
            })
            .onComplete(() => {
                tween = null;
                fire(TweenFly, idx + 1, false);
            })
            .onStop(() => {
                tween = null;
            });
    });

    // on(TweenFly, () => {
    //     fire(TweenFlyEnable);

    //     const controls: Controls = fire(GetControls);

    //     const points: Vector3[] = [controls.object.position.clone()];
    //     const tgts: Vector3[] = [controls.target.clone()];
    //     const all: Vector3[] = fire(GetFlyPositions) || [];
    //     for (let i = 0, max = Math.min(all.length, 100); i < max; i++) {
    //         all[i] && points.push(all[i]);
    //         flyTargets[i] && tgts.push(flyTargets[i]);
    //     }

    //     fire(StopAutoRotate, false);

    //     const curvePos = new CatmullRomCurve3(points);
    //     curvePos.closed = true;
    //     const curveTgt = new CatmullRomCurve3(tgts);
    //     curveTgt.closed = true;
    //     // 动画参数
    //     let t = 0; // 插值因子
    //     const speed = (0.0005 * 30) / Math.max(fire(GetFpsReal), 10); // 运动速度(路径点数长度、帧率相关，统一调整比较麻烦)

    //     on(
    //         OnViewerAfterUpdate,
    //         () => {
    //             if (!flyEnable) return;

    //             t += speed;
    //             if (t > 1) t = 0;
    //             const pt = curvePos.getPoint(t);
    //             const tgt = curveTgt.getPoint(t);

    //             controls.object.position.set(pt.x, pt.y, pt.z);
    //             controls.target.set(tgt.x, tgt.y, tgt.z);
    //         },
    //         true,
    //     );
    // });

    on(
        OnViewerAfterUpdate,
        () => {
            flyEnable && tween?.update();
        },
        true,
    );
}
