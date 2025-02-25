// ================================
// Copyright (c) 2025 reall3d.com
// ================================

/**
 * 模型格式
 */
export type ModelFormat = 'splat' | 'bin' | 'json' | undefined;

/**
 * 高斯模型选项
 */
export interface ModelOptions {
    /**
     *  模型地址
     */
    url?: string;

    /**
     *  模型格式（splat | bin），默认自动识别
     */
    format?: ModelFormat | undefined;
}
