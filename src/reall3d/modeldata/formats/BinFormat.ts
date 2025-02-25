// ================================
// Copyright (c) 2025 reall3d.com
// ================================
/**
 * Bin文件头信息
 */
export class BinHeader {
    public Fixed: string;
    public Version: number;
    public Kind: number;
    public Id: number;
    public SplatCount: number;
    public Level: number;
    public CenterX: number;
    public CenterY: number;
    public CenterZ: number;
    public MinX: number;
    public MaxX: number;
    public MinY: number;
    public MaxY: number;
    public MinZ: number;
    public MaxZ: number;
    public TopY: number;
    public MaxRadius: number;
    public PositionX: number;
    public PositionY: number;
    public PositionZ: number;
    public RotationX: number;
    public RotationY: number;
    public RotationZ: number;
    public ScaleX: number;
    public ScaleY: number;
    public ScaleZ: number;
    public Lon: number;
    public Lat: number;
    public Height: number;
    public FactorPosition: number;
    public FactorScale: number;
    public ParentId: number;
    public AuthHashCode: number;
    /** level */
    public F0: boolean;
    /** 中心坐标 */
    public F1: boolean;
    /** 包围盒 */
    public F2: boolean;
    /** 中心高度 */
    public F3: boolean;
    /** 最大半径 */
    public F4: boolean;
    /** 矩阵参数 */
    public F5: boolean;
    /** 经纬高度 */
    public F6: boolean;
    /** 父ID */
    public F7: boolean;
    /** 有无水印 */
    public F8: boolean;
    /** xxxxxxxx */
    public F9: boolean;
    /** xxxxxxxx */
    public F10: boolean;
    /** xxxxxxxx */
    public F11: boolean;
    /** xxxxxxxx */
    public F12: boolean;
    /** xxxxxxxx */
    public F13: boolean;
    /** xxxxxxxx */
    public F14: boolean;
    /** 反转Y */
    public F15: boolean;

    constructor(rs?: number[]) {
        if (!rs) return;

        let k = 0;
        let m = 40;
        let n = 50;
        const ver = rs[40];
        this.Fixed = 'yc';

        if (ver === 1) {
            this.F0 = false;
            this.F1 = true;
            this.F2 = true;
            this.F3 = true;
            this.F4 = true;
            this.F15 = true;

            this.Version = rs[m++];
            this.Kind = rs[m++];
            this.Id = rs[m++];
            this.SplatCount = rs[m++];

            this.CenterX = rs[n++];
            this.CenterY = rs[n++];
            this.CenterZ = rs[n++];
            this.MinX = rs[n++];
            this.MaxX = rs[n++];
            this.MinY = rs[n++];
            this.MaxY = rs[n++];
            this.MinZ = rs[n++];
            this.MaxZ = rs[n++];
            this.TopY = rs[n++];
            this.MaxRadius = rs[n++];
        } else if (ver === 2) {
            this.F0 = !!rs[k++];
            this.F1 = !!rs[k++];
            this.F2 = !!rs[k++];
            this.F3 = !!rs[k++];
            this.F4 = !!rs[k++];
            this.F5 = !!rs[k++];
            this.F6 = !!rs[k++];
            this.F7 = !!rs[k++];
            this.F8 = !!rs[k++];
            this.F9 = !!rs[k++];
            this.F10 = !!rs[k++];
            this.F11 = !!rs[k++];
            this.F12 = !!rs[k++];
            this.F13 = !!rs[k++];
            this.F14 = !!rs[k++];
            this.F15 = !!rs[k++];

            this.Version = rs[m++];
            this.Kind = rs[m++];
            this.Id = rs[m++];
            this.SplatCount = rs[m++];
            this.Level = rs[m++];
            this.ParentId = rs[m++]; // v2
            this.AuthHashCode = rs[m++]; // v2

            this.CenterX = rs[n++];
            this.CenterY = rs[n++];
            this.CenterZ = rs[n++];
            this.MinX = rs[n++];
            this.MaxX = rs[n++];
            this.MinY = rs[n++];
            this.MaxY = rs[n++];
            this.MinZ = rs[n++];
            this.MaxZ = rs[n++];
            this.TopY = rs[n++];
            this.MaxRadius = rs[n++];
            this.PositionX = rs[n++];
            this.PositionY = rs[n++];
            this.PositionZ = rs[n++];
            this.RotationX = rs[n++];
            this.RotationY = rs[n++];
            this.RotationZ = rs[n++];
            this.ScaleX = rs[n++];
            this.ScaleY = rs[n++];
            this.ScaleZ = rs[n++];
            this.Lon = rs[n++];
            this.Lat = rs[n++];
            this.Height = rs[n++];
            this.FactorPosition = rs[n++]; // v2
            this.FactorScale = rs[n++]; // v2
        }
    }
}
