// ================================
// Copyright (c) 2025 reall3d.com
// ================================
/**
 * 纹理
 */
interface SplatTexture {
    /** 索引（0 | 1） */
    index: number;
    /** 纹理版本（毫秒时间戳） */
    version?: number;
    /** 坐标数据 */
    xyz?: Float32Array;
    /** 水印坐标数据 */
    wxyz?: number[];
    /** 纹理数据就绪标志 */
    textureReady?: boolean;
    /** 纹理数据就绪时间点 */
    textureReadyTime?: number;
    /** 是否活动状态 */
    active?: boolean;

    /** 包围盒极限点 */
    minX?: number;
    /** 包围盒极限点 */
    maxX?: number;
    /** 包围盒极限点 */
    minY?: number;
    /** 包围盒极限点 */
    maxY?: number;
    /** 包围盒极限点 */
    minZ?: number;
    /** 包围盒极限点 */
    maxZ?: number;

    // 例：共 m 个模型处理中，其中 v 个模型下载有数据且当前可见，有 r 个合并后的Splat待渲染
    /** 待渲染的Splat数量 */
    renderSplatCount?: number;
    /** 可见且可用的Splat数量 */
    visibleSplatCount?: number;
    /** 所有处理中的模型Splat数量合计 */
    modelSplatCount?: number;
}
