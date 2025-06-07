// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
import { Matrix4, Vector3 } from 'three';
import { CameraInfo } from '../controls/SetupCameraControls';
import { ModelOptions } from './ModelOptions';

/**
 * spx文件头信息
 */
export class SpxHeader {
    public Fixed: string;
    public Version: number;
    public SplatCount: number;
    public MinX: number;
    public MaxX: number;
    public MinY: number;
    public MaxY: number;
    public MinZ: number;
    public MaxZ: number;
    public MinTopY: number;
    public MaxTopY: number;
    public CreateDate: number;
    public CreaterId: number;
    public ExclusiveId: number;
    public ShDegree: number;
    public Flag1: number;
    public Flag2: number;
    public Flag3: number;
    public Reserve1: number;
    public Reserve2: number;
    public Comment: string;

    public HashCheck: boolean;
}

/**
 * Splat模型
 */
export class SplatModel {
    /** 模型选项 */
    public readonly opts: ModelOptions;

    /** 模型文件大小 */
    public fileSize: number = 0;
    /** 模型已下载大小 */
    public downloadSize: number = 0;

    /** 模型状态 */
    public status: ModelStatus = ModelStatus.FetchReady;

    /** 模型数据 */
    public splatData: Uint8Array = null;
    /** 模型水印数据 */
    public watermarkData: Uint8Array = null;
    /** 模型数据数量 */
    public dataSplatCount: number = 0;
    /** 模型水印数量 */
    public watermarkCount: number = 0;

    /** 球谐系数（1级，或1级和2级） */
    public sh12Data: Uint8Array[] = [];
    /** 球谐系数（仅3级） */
    public sh3Data: Uint8Array[] = [];
    /** 已下载的球谐系数（1级，或1级和2级）数量 */
    public sh12Count: number = 0;
    /** 已下载的球谐系数（仅3级）数量 */
    public sh3Count: number = 0;

    /** 一个高斯点数据长度 */
    public rowLength: number = 0;
    /** 模型的高斯数量 */
    public modelSplatCount: number = -1;
    /** 已下载的高斯数量 */
    public downloadSplatCount: number = 0;
    /** 待渲染的高斯数量（大场景时动态计算需要渲染的数量） */
    public renderSplatCount: number = 0;

    /** 中断控制器 */
    public abortController: AbortController;

    /** spx格式模型的头信息 */
    public header: SpxHeader = null;

    public dataShDegree: number = 0;

    public meta: MetaData;
    public map: Map<string, CutData>;

    public minX: number = Infinity;
    public maxX: number = -Infinity;
    public minY: number = Infinity;
    public maxY: number = -Infinity;
    public minZ: number = Infinity;
    public maxZ: number = -Infinity;
    public topY: number = 0;
    public currentRadius: number = 0;
    public aabbCenter: Vector3;
    public maxRadius: number = 0; // spx包围球半径
    public metaMatrix: Matrix4;

    public notifyFetchStopDone: boolean;
    public smallSceneUploadDone: boolean;
    public textWatermarkVersion: number = 0;
    public lastTextWatermarkVersion: number = 0;

    public fetchLimit: number = 0;

    public activePoints: any;

    constructor(opts: ModelOptions, meta: MetaData = {}) {
        this.opts = { ...opts };
        const that = this;

        that.meta = meta;
        meta.autoCut && (that.map = new Map());
        that.metaMatrix = meta.transform ? new Matrix4().fromArray(meta.transform) : null;

        if (!opts.format) {
            if (opts.url?.endsWith('.spx')) {
                that.opts.format = 'spx';
            } else if (opts.url?.endsWith('.splat')) {
                that.opts.format = 'splat';
            } else if (opts.url?.endsWith('.ply')) {
                that.opts.format = 'ply';
            } else if (opts.url?.endsWith('.spz')) {
                that.opts.format = 'spz';
            } else {
                console.error('unknow format!');
            }
        }
        that.abortController = new AbortController();
    }
}

/**
 * 大场景用切割的数据块
 */
export interface CutData {
    /** 块中数据的高斯点数 */
    splatCount?: number;
    /** 块中数据 */
    splatData?: Uint8Array;

    // 块的包围盒
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    minZ?: number;
    maxZ?: number;
    // 块的包围球
    center?: Vector3;
    radius?: number;

    /** 当前待渲染点数（动态计算使用） */
    currentRenderCnt?: number;
    /** 离相机距离（动态计算使用） */
    distance?: number;
}

/**
 * 模型状态
 */
export enum ModelStatus {
    /** 就绪 */
    FetchReady = 0,
    /** 请求中 */
    Fetching,
    /** 正常完成 */
    FetchDone,
    /** 请求途中被中断 */
    FetchAborted,
    /** 请求失败 */
    FetchFailed,
    /** 无效的模型格式或数据 */
    Invalid,
}

/**
 * 元数据
 */
export interface MetaData {
    /** 名称 */
    name?: string;
    /** 版本 */
    version?: string;
    /** 更新日期（YYYYMMDD） */
    updateDate?: number;

    /** 是否自动旋转 */
    autoRotate?: boolean;
    /** 是否调试模式 */
    debugMode?: boolean;
    /** 是否点云模式 */
    pointcloudMode?: boolean;
    /** 移动端最大渲染数量 */
    maxRenderCountOfMobile?: number;
    /** PC端最大渲染数量 */
    maxRenderCountOfPc?: number;
    /** 移动端最大下载数量 */
    mobileDownloadLimitSplatCount?: number;
    /** PC端最大下载数量 */
    pcDownloadLimitSplatCount?: number;

    /** 米比例尺 */
    meterScale?: number;
    /** 文字水印 */
    watermark?: string;
    /** 是否显示水印 */
    showWatermark?: boolean;
    /** 是否显示包围盒 */
    showBoundBox?: boolean;
    /** 相机参数 */
    cameraInfo?: CameraInfo;
    /** 标注 */
    marks?: any[];
    /** 飞翔相机位置点 */
    flyPositions?: number[];
    /** 飞翔相机注视点 */
    flyTargets?: number[];

    /** 是否粒子加载效果，小场景用 */
    particleMode?: boolean;

    /** 自动切割数量 */
    autoCut?: number;
    /** 变换矩阵 */
    transform?: number[];
    /** 定位坐标(EPSG:4326 WGS 84) */
    WGS84?: number[];
    /** 模型地址 */
    url?: string;
}
