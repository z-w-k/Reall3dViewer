// ================================
// Copyright (c) 2025 reall3d.com
// ================================
/**
 * 高斯模型选项
 */
export interface ModelOptions {
    /**
     *  模型地址
     */
    url: string;

    /**
     *  模型格式（ply | splat | spx | spz），默认自动识别
     */
    format?: 'ply' | 'splat' | 'spx' | 'spz';

    /**
     *  是否重新下载
     */
    fetchReload?: boolean;

    /**
     *  限制高斯点数
     */
    downloadLimitSplatCount?: number;
}
