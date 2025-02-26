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
     *  模型格式（splat | bin | json），默认自动识别
     */
    format?: 'splat' | 'bin' | 'json' | undefined;

    /**
     *  是否单纯数据
     */
    dataOnly?: boolean | undefined;

    /**
     *  是否重新下载
     */
    fetchReload?: boolean | undefined;

    /**
     *  限制高斯点数
     */
    limitSplatCount?: number | undefined;
}
