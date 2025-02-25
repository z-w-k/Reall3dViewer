// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Events } from '../events/Events';
import { GetWorker, WorkerSort, WorkerDispose, GetViewProjectionMatrixArray, GetMaxRenderCount } from '../events/EventConstants';
import { WkMaxRenderCount, WkViewProjection } from '../utils/consts/WkConstants';

export function setupWorker(events: Events) {
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);
    const fire = (key: number, ...args: any): any => events.fire(key, ...args);
    const worker = new Worker(new URL('./Worker.ts', import.meta.url), { type: 'module' });
    worker.postMessage({ [WkMaxRenderCount]: fire(GetMaxRenderCount) });
    on(GetWorker, () => worker);
    on(WorkerSort, () => worker.postMessage({ [WkViewProjection]: fire(GetViewProjectionMatrixArray) }));
    on(WorkerDispose, () => worker.terminate());
}
