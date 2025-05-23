// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Vector3 } from 'three';
import { TileMap } from '@gotoeasy/three-tile';

/**
 * 地图配置项
 */
export interface Reall3dMapViewerOptions {
    /**
     *  容器元素或其选择器，默认选择器为'#gsviewer'，自动创建画布时若找不到容器节点，将在body下自动创建容器
     */
    root?: HTMLElement | string | undefined;

    /**
     * 初始相机视点
     */
    lookAt?: Vector3;

    /**
     * 初始相机位置
     */
    position?: Vector3;

    /**
     * 地图
     */
    tileMap?: TileMap;

    /**
     *  是否调试模式，生产环境默认false
     */
    debugMode?: boolean | undefined;
}
