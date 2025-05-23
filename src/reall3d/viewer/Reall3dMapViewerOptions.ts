// ================================
// Copyright (c) 2025 reall3d.com
// ================================
import { Vector3 } from 'three';
import { TileMap } from '@gotoeasy/three-tile';

/**
 * 地图配置项
 */
export interface Reall3dMapViewerOptions {
    lookAtLLH?: Vector3; // 地图中心点经纬度
    positionLLH?: Vector3; // 相机位置经纬度
    lookAt?: Vector3;
    position?: Vector3;
    antialias?: boolean;
    stencil?: boolean;
    logarithmicDepthBuffer?: boolean;
    root?: HTMLElement | string | undefined; // 容器元素或其选择器
    tileMap?: TileMap;
    /**
     *  是否调试模式，生产环境默认false
     */
    debugMode?: boolean | undefined;
}
