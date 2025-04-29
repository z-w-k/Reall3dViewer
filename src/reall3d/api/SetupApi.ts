// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Events } from '../events/Events';
import { HttpPostMetaData, HttpQueryGaussianText } from '../events/EventConstants';
import { ViewerVersion } from '../utils/consts/GlobalConstants';
import { MetaData } from '../modeldata/ModelData';
export function setupApi(events: Events) {
    const on = (key: number, fn?: Function, multiFn?: boolean): Function | Function[] => events.on(key, fn, multiFn);

    on(HttpPostMetaData, (meta: MetaData) => {
        // TODO post meta data to server here
        const url = meta.url;
        const metaClone: MetaData = { ...meta };
        delete metaClone.url;
        const metaJson = JSON.stringify(meta, null, 2);
        console.info(metaJson);
    });

    on(HttpQueryGaussianText, (text: string = '') => {
        const url = 'https://reall3d.com/gsfont/api/getGaussianText';
        const formData = new FormData();
        formData.append('text', text.substring(0, 100)); // 限制查取最大100字
        formData.append('ver', ViewerVersion);

        return new Promise(resolve => {
            fetch(url, { method: 'POST', body: formData })
                .then(response => (response.ok ? response.json() : {}))
                .then((data: any) => (data.success ? resolve(JSON.parse(data.data)) : resolve([])))
                .catch(e => resolve([]));
        });
    });
}
