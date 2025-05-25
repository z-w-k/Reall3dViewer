// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
import { Vector3 } from 'three';

/**
 * 地图配置项
 */
export interface Reall3dMapViewerOptions {
    /**
     *  容器元素或其选择器，默认选择器为'#map'，自动创建画布时若找不到容器节点，将在'#gsviewer'下自动创建容器
     */
    root?: HTMLElement | string;

    /**
     *  是否调试模式，生产环境默认false
     */
    debugMode?: boolean;
}
