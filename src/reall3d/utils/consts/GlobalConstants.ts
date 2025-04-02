// ================================
// Copyright (c) 2025 reall3d.com
// ================================
export const ViewerVersion = 'v1.3.0-dev-spx'; // Reall3dViewer 版本

export const isMobile = navigator.userAgent.includes('Mobi');
export const HalfChars = 'QWERTYUIOPLKJHGFDSAZXCVBNM1234567890qwertyuioplkjhgfdsazxcvbnm`~!@#$%^&*()-_=+\\|]}[{\'";::,<.>//? \t';
export const BinHeaderSize = 140;
export const SpxHeaderSize = 128;
export const DataSize36 = 36;
export const DataSize32 = 32;
export const SplatDataSize32 = 32;
export const SplatDataSize20 = 20;
export const SplatDataSize16 = 16;
export const WasmBlockSize: number = 64 * 1024;
export const MobileDownloadLimitSplatCount = 1024 * 10000; // 移动端高斯点数下载限制
export const PcDownloadLimitSplatCount = 10240 * 10000; // PC端高斯点数下载限制

/** 【官方创建者Reall3d】Creater: Reall3d */
export const SpxCreaterReall3d = 0;
/** 【spx中定义的公开格式】spx open format */
export const SpxOpenFormat0 = 0;
/** 【Reall3D扩展的专属格式】the exclusive format extended by reall3d */
export const SpxExclusiveFormatReall3d = 3141592653;
