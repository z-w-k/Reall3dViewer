// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
/**
 * 地图配置项
 */
export declare interface Reall3dMapViewerOptions {
    /**
     *  容器元素或其选择器，默认选择器为'#map'，找不到时将自动创建
     */
    root?: HTMLElement | string;

    /**
     * 是否允许键盘操作，默认false
     */
    enableKeyboard?: boolean;

    /**
     * 拖动范围最小值，默认[-20000, 0.1, -60000]
     */
    minPan?: number[];

    /**
     * 拖动范围最大值，默认[50000, 10000, 0]
     */
    maxPan?: number[];

    /**
     *  是否调试模式，生产环境默认false
     */
    debugMode?: boolean;
}
