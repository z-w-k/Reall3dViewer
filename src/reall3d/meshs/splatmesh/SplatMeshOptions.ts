// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
import { Matrix4, Renderer, Scene } from 'three';
import { Events } from '../../events/Events';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

/**
 * 高斯网格配置项
 */
export interface SplatMeshOptions {
    /**
     * 名称
     */
    name?: string;

    /**
     * 指定渲染器对象传入使用
     */
    renderer: Renderer;

    /**
     * 指定场景对象传入使用
     */
    scene: Scene;

    /**
     * 控制器
     */
    controls?: OrbitControls;

    /**
     * 渲染器事件管理器
     */
    viewerEvents?: Events;

    /**
     * 是否调试模式，生产环境默认false
     */
    debugMode?: boolean;

    /**
     * 是否大场景模式，初始化后不可修改
     */
    bigSceneMode?: boolean;

    /**
     * 是否点云模式渲染，默认为true
     * 支持通过viewer.options()动态更新
     */
    pointcloudMode?: boolean;

    /**
     * 移动端可渲染的高斯点数量限制
     * 支持通过viewer.options()动态更新
     */
    maxRenderCountOfMobile?: number;

    /**
     * PC端可渲染的高斯点数量限制
     * 支持通过viewer.options()动态更新
     */
    maxRenderCountOfPc?: number;

    /**
     * 颜色亮度系数，默认1.0
     */
    lightFactor?: number;

    /**
     * 是否显示水印，默认true
     */
    showWatermark?: boolean;

    /**
     * 球谐系数的渲染级别，默认0
     */
    shDegree?: number;

    /**
     * 是否开启深度测试，默认true
     */
    depthTest?: boolean;
}
