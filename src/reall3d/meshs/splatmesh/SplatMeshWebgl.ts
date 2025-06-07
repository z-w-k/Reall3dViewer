// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
export function getSplatVertexShader() {
    return `
        precision highp float;

        uniform highp usampler2D splatTexture0, splatTexture1, splatShTexture12, splatShTexture3;
        uniform vec2 focal, viewport;
        uniform int usingIndex, shDegree, particleMode;
        uniform bool pointMode, bigSceneMode, showWaterMark, debugEffect;
        uniform float topY, maxRadius, currentVisibleRadius, currentLightRadius, performanceNow, performanceAct;
        uniform vec4 markPoint, waterMarkColor;
        uniform uint flagValue;

        attribute uint splatIndex;

        varying vec4 vColor;
        varying vec3 vPosition;

        const float FactorSH = 0.0625;
        const uint MaskSH = 0x1Fu;
        const float SH_C1 = 0.4886025119029199;
        const float[5] SH_C2 = float[](1.0925484305920792f, -1.0925484305920792f, 0.31539156525252005f, -1.0925484305920792f, 0.5462742152960396f);
        const float[7] SH_C3 = float[](-0.5900435899266435f, 2.890611442640554f, -0.4570457994644658f, 0.3731763325901154f, -0.4570457994644658f, 1.445305721320277f, -0.5900435899266435f);

        vec3[15] readShDatas() {
            int shCnt = 0;
            float[45] fSHs;
            uvec4 rgb12 = texelFetch(splatShTexture12, ivec2((splatIndex & 0x7ffu), (splatIndex >> 11)), 0);
            if ( rgb12.a > 0u ) {
                shCnt = 3;
                fSHs[0] = float((rgb12.r >> 27) & MaskSH) * FactorSH - 1.0;
                fSHs[1] = float((rgb12.r >> 22) & MaskSH) * FactorSH - 1.0;
                fSHs[2] = float((rgb12.r >> 17) & MaskSH) * FactorSH - 1.0;
                fSHs[3] = float((rgb12.r >> 12) & MaskSH) * FactorSH - 1.0;
                fSHs[4] = float((rgb12.r >> 7) & MaskSH) * FactorSH - 1.0;
                fSHs[5] = float((rgb12.r >> 2) & MaskSH) * FactorSH - 1.0;
                fSHs[6] = float(( (rgb12.r << 3) | (rgb12.g >> 29) ) & MaskSH) * FactorSH - 1.0;
                fSHs[7] = float((rgb12.g >> 24) & MaskSH) * FactorSH - 1.0;
                fSHs[8] = float((rgb12.g >> 19) & MaskSH) * FactorSH - 1.0;

                if (shDegree > 1) {
                    shCnt = 8;
                    fSHs[9]  = float((rgb12.g >> 14) & MaskSH) * FactorSH - 1.0;
                    fSHs[10] = float((rgb12.g >> 9) & MaskSH) * FactorSH - 1.0;
                    fSHs[11] = float((rgb12.g >> 4) & MaskSH) * FactorSH - 1.0;
                    fSHs[12] = float(( (rgb12.g << 1) | (rgb12.b >> 31) ) & MaskSH) * FactorSH - 1.0;
                    fSHs[13] = float((rgb12.b >> 26) & MaskSH) * FactorSH - 1.0;
                    fSHs[14] = float((rgb12.b >> 21) & MaskSH) * FactorSH - 1.0;
                    fSHs[15] = float((rgb12.b >> 16) & MaskSH) * FactorSH - 1.0;
                    fSHs[16] = float((rgb12.b >> 11) & MaskSH) * FactorSH - 1.0;
                    fSHs[17] = float((rgb12.b >> 6) & MaskSH) * FactorSH - 1.0;
                    fSHs[18] = float((rgb12.b >> 1) & MaskSH) * FactorSH - 1.0;
                    fSHs[19] = float(( (rgb12.b << 4) | (rgb12.a >> 28) ) & MaskSH) * FactorSH - 1.0;
                    fSHs[20] = float(((rgb12.a >> 23) & MaskSH)) * FactorSH - 1.0;
                    fSHs[21] = float((rgb12.a >> 18) & MaskSH) * FactorSH - 1.0;
                    fSHs[22] = float((rgb12.a >> 13) & MaskSH) * FactorSH - 1.0;
                    fSHs[23] = float((rgb12.a >> 8) & MaskSH) * FactorSH - 1.0;

                    if (shDegree > 2) {
                        uvec4 rgb3 = texelFetch(splatShTexture3, ivec2(splatIndex & 0x7ffu, splatIndex >> 11), 0);
                        if ( rgb3.a > 0u ) {
                            shCnt = 15;
                            fSHs[24] = float((rgb3.r >> 27) & MaskSH) * FactorSH - 1.0;
                            fSHs[25] = float((rgb3.r >> 22) & MaskSH) * FactorSH - 1.0;
                            fSHs[26] = float((rgb3.r >> 17) & MaskSH) * FactorSH - 1.0;
                            fSHs[27] = float((rgb3.r >> 12) & MaskSH) * FactorSH - 1.0;
                            fSHs[28] = float((rgb3.r >> 7) & MaskSH) * FactorSH - 1.0;
                            fSHs[29] = float((rgb3.r >> 2) & MaskSH) * FactorSH - 1.0;
                            fSHs[30] = float(( (rgb3.r << 3) | (rgb3.g >> 29) ) & MaskSH) * FactorSH - 1.0;
                            fSHs[31] = float((rgb3.g >> 24) & MaskSH) * FactorSH - 1.0;
                            fSHs[32] = float((rgb3.g >> 19) & MaskSH) * FactorSH - 1.0;
                            fSHs[33]  = float((rgb3.g >> 14) & MaskSH) * FactorSH - 1.0;
                            fSHs[34] = float((rgb3.g >> 9) & MaskSH) * FactorSH - 1.0;
                            fSHs[35] = float((rgb3.g >> 4) & MaskSH) * FactorSH - 1.0;
                            fSHs[36] = float(( (rgb3.g << 1) | (rgb3.b >> 31) ) & MaskSH) * FactorSH - 1.0;
                            fSHs[37] = float((rgb3.b >> 26) & MaskSH) * FactorSH - 1.0;
                            fSHs[38] = float((rgb3.b >> 21) & MaskSH) * FactorSH - 1.0;
                            fSHs[39] = float((rgb3.b >> 16) & MaskSH) * FactorSH - 1.0;
                            fSHs[40] = float((rgb3.b >> 11) & MaskSH) * FactorSH - 1.0;
                            fSHs[41] = float((rgb3.b >> 6) & MaskSH) * FactorSH - 1.0;
                            fSHs[42] = float((rgb3.b >> 1) & MaskSH) * FactorSH - 1.0;
                            fSHs[43] = float(( (rgb3.b << 4) | (rgb3.a >> 28) ) & MaskSH) * FactorSH - 1.0;
                            fSHs[44] = float((rgb3.a >> 23) & MaskSH) * FactorSH - 1.0;
                        }
                    }
                }
            }

            vec3[15] sh;
            for (int i = 0; i < 15; ++i) {
                sh[i] = i < shCnt ? vec3(fSHs[i*3], fSHs[i*3 + 1], fSHs[i*3 + 2]) : vec3(0.0);
            }
            return sh;
        }

        // https://github.com/graphdeco-inria/gaussian-splatting/blob/main/utils/sh_utils.py
        vec3 evalSH(in vec3 v3Cen) {
            vec3 dir = normalize(v3Cen - cameraPosition);
            float x = dir.x;
            float y = dir.y;
            float z = dir.z;

            vec3[15] sh = readShDatas();
            vec3 result = SH_C1 * (-sh[0] * y + sh[1] * z - sh[2] * x);

            if (shDegree > 1) {
                float xx = x * x;
                float yy = y * y;
                float zz = z * z;
                float xy = x * y;
                float yz = y * z;
                float xz = x * z;

                result +=
                    sh[3] * (SH_C2[0] * xy) +
                    sh[4] * (SH_C2[1] * yz) +
                    sh[5] * (SH_C2[2] * (2.0 * zz - xx - yy)) +
                    sh[6] * (SH_C2[3] * xz) +
                    sh[7] * (SH_C2[4] * (xx - yy));

                if (shDegree > 2) {
                    result +=
                        sh[8]  * (SH_C3[0] * y * (3.0 * xx - yy)) +
                        sh[9]  * (SH_C3[1] * xy * z) +
                        sh[10] * (SH_C3[2] * y * (4.0 * zz - xx - yy)) +
                        sh[11] * (SH_C3[3] * z * (2.0 * zz - 3.0 * xx - 3.0 * yy)) +
                        sh[12] * (SH_C3[4] * x * (4.0 * zz - xx - yy)) +
                        sh[13] * (SH_C3[5] * z * (xx - yy)) +
                        sh[14] * (SH_C3[6] * x * (xx - 3.0 * yy));
                }
            }
            return result;
        }

        int animateParticle(out vec3 v3Cen, int particleMode, float performanceNow, float performanceAct, float currentVisibleRadius, float maxRadius) {
            if (particleMode < 1) return 0;    
            float factor = particleMode>1? ((performanceAct-performanceNow)/5000.0):(performanceNow/5000.0);
            float radius = particleMode>1? (max(currentVisibleRadius, maxRadius)*0.6 * min((performanceNow)/3000.0, 1.0)) : (max(currentVisibleRadius, maxRadius)*0.6 * min((performanceNow-performanceAct)/3000.0, 1.0));
            if (factor <= 0.0) return 0;

            // 随机种子（均匀分布）
            vec3 randSeed = fract(sin(vec3(
                dot(v3Cen, vec3(12.9898, 78.233, 37.719)),
                dot(v3Cen.yzx, vec3(49.123, 23.456, 87.654)),
                dot(v3Cen.zxy, vec3(34.567, 91.234, 56.789))
            ))) * 2.0 - 1.0;

            // 动态相位计算（增加随机性）
            float phase = factor * 12.0 
                + v3Cen.y * (15.0 + randSeed.x * 3.0) 
                + v3Cen.z * (13.0 + randSeed.y * 2.0);

            // 混合波形计算（增加复杂性）
            float wave1 = sin(phase * (2.0 + randSeed.y * 1.5 + randSeed.z * 1.5));
            float wave2 = cos(phase * (1.2 + randSeed.x * 0.3) + v3Cen.x * 20.0);
            float dynamicFactor = mix(wave1, wave2, 0.5 + randSeed.z * 0.2) * 0.5 + 0.5;

            // 均匀的运动幅度（不再依赖距离）
            float amplitude = radius * 0.25 * factor * (0.9 + randSeed.z * 0.2);

            // 位移应用（三轴都有适度运动）
            vec3 offset = vec3(
                amplitude * (dynamicFactor * 2.0 - 1.0),
                amplitude * randSeed.x * 5.0,
                amplitude * randSeed.y * 2.5
            );
            
            // 物理碰撞系统（保持反弹效果）
            vec3 newPos = v3Cen + offset;
            float newDist = length(newPos);
            if (newDist > radius) {
                vec3 dir = normalize(newPos);
                float penetration = newDist - radius;
                float elasticity = 0.7 + randSeed.z * 0.2;
                
                // 反弹（带切向扰动）
                vec3 bounceVec = dir * penetration * elasticity;
                vec3 tangent = normalize(cross(dir, vec3(randSeed.x, randSeed.y, 1.0)));
                newPos -= bounceVec - tangent * (length(randSeed.xy) * penetration * 0.2);
            }

            // 最终约束（确保严格在球体内）
            v3Cen = normalize(newPos) * min(length(newPos), radius);
            return 1;
        }

        void main () {
            uvec4 cen, cov3d;
            if (bigSceneMode) {
                if (usingIndex == 0){
                    cen = texelFetch(splatTexture0, ivec2((splatIndex & 0x3ffu) << 1, splatIndex >> 10), 0);
                    cov3d = texelFetch(splatTexture0, ivec2(((splatIndex & 0x3ffu) << 1) | 1u, splatIndex >> 10), 0);
                }else{
                    cen = texelFetch(splatTexture1, ivec2((splatIndex & 0x3ffu) << 1, splatIndex >> 10), 0);
                    cov3d = texelFetch(splatTexture1, ivec2(((splatIndex & 0x3ffu) << 1) | 1u, splatIndex >> 10), 0);
                }
            } else {
                cen = texelFetch(splatTexture0, ivec2((splatIndex & 0x3ffu) << 1, splatIndex >> 10), 0);
                cov3d = texelFetch(splatTexture0, ivec2(((splatIndex & 0x3ffu) << 1) | 1u, splatIndex >> 10), 0);
            }
 
            uint fvSplat = cen.w & 65535u;
            uint fvHide = flagValue >> 16u;
            uint fvShow = flagValue & 65535u;
            float fvAlpha = 1.0;
            if (fvSplat > 0u) {
                if ( fvSplat == fvShow ) {
                    fvAlpha = clamp((performanceNow - performanceAct) / 2000.0, 0.0, 1.0);
                } else if ( fvSplat == fvHide) {
                    fvAlpha = 1.0 - clamp((performanceNow - performanceAct) / 2000.0, 0.0, 1.0);
                } else {
                    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
                    return;
                }
            }

            bool isWatermark = (cen.w & 65536u) > 0u;
            vec3 v3Cen = uintBitsToFloat(cen.xyz);

            animateParticle(v3Cen, particleMode, performanceNow, performanceAct, currentVisibleRadius, maxRadius);

            if ( isWatermark && debugEffect) {
                v3Cen.y += sin(performanceNow*0.002 + v3Cen.x) * 0.1; // 水印动画
            }

            vec4 cam = modelViewMatrix * vec4(v3Cen, 1.0);
            vec4 pos2d = projectionMatrix * cam;
            float clip = 1.2 * pos2d.w;
            if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip
                || isWatermark && (!showWaterMark || pointMode) ) {
                gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
                return;
            }

            float currentRadius = length(vec3(0.0, topY, 0.0) - v3Cen);
            if ( currentVisibleRadius > 0.0 && currentRadius > currentVisibleRadius ) {
                gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
                return;
            }

            vec2 uh1 = unpackHalf2x16(cov3d.x), uh2 = unpackHalf2x16(cov3d.y), uh3 = unpackHalf2x16(cov3d.z);
            mat3 Vrk = mat3(uh1.x, uh1.y, uh2.x, uh1.y, uh2.y, uh3.x, uh2.x, uh3.x, uh3.y);
        
            float ZxZ = cam.z * cam.z;
            mat3 J_m3 = mat3(
                focal.x / cam.z, 0.0, -(focal.x * cam.x) / ZxZ, 
                0.0, focal.y / cam.z, -(focal.y * cam.y) / ZxZ, 
                0.0, 0.0, 0.0
            );
        
            mat3 T_m3 = transpose(mat3(modelViewMatrix)) * J_m3;
            mat3 cov2d = transpose(T_m3) * Vrk * T_m3;

            cov2d[0][0] += 0.3;
            cov2d[1][1] += 0.3;
            vec3 cov2Dv = vec3(cov2d[0][0], cov2d[0][1], cov2d[1][1]);
            float eigenValue1 =  0.5 * (cov2Dv.x + cov2Dv.z) + sqrt((cov2Dv.x + cov2Dv.z) * (cov2Dv.x + cov2Dv.z) / 4.0 - (cov2Dv.x * cov2Dv.z - cov2Dv.y * cov2Dv.y));
            float eigenValue2 = max( 0.5 * (cov2Dv.x + cov2Dv.z) - sqrt((cov2Dv.x + cov2Dv.z) * (cov2Dv.x + cov2Dv.z) / 4.0 - (cov2Dv.x * cov2Dv.z - cov2Dv.y * cov2Dv.y)), 0.0);
            float eigenValueOrig1 = eigenValue1;
            float eigenValueOrig2 = eigenValue2;

            bool isLightColor = false;
            if ( !isWatermark ) {
                if ( pointMode ) {
                    eigenValue1 = eigenValue2 = 0.5;
                }

                if ( !bigSceneMode && currentLightRadius > 0.0 ) {
                    // 仅小场景支持光圈过渡效果
                    if ( currentRadius < currentLightRadius && currentRadius > currentLightRadius * 0.9 ) {
                        eigenValue1 = eigenValueOrig1;
                        eigenValue2 = eigenValueOrig2;
                        isLightColor = true;
                    }
                    if ( currentRadius < currentLightRadius * 0.9 ){
                        if ( pointMode ){
                            eigenValue1 = eigenValueOrig1;
                            eigenValue2 = eigenValueOrig2;
                        } else {
                            eigenValue1 = eigenValue2 = 0.5;
                        }
                    }
                }
            }

            vPosition = vec3(position.xy, -1.0);
            vec2 eigenVector1 = normalize(vec2(cov2Dv.y, eigenValue1 - cov2Dv.x));
            bool isSelectPoint = markPoint.w > 0.0 && length(vec3(markPoint.xyz) - v3Cen) < 0.000001;
            if (markPoint.w > 0.0 && length(vec3(markPoint.xyz) - v3Cen) < 0.000001){
                vColor = vec4(1.0, 1.0, 0.0, 1.0);
                eigenValue1 = eigenValue2 = 11.0;
                eigenVector1 = normalize(vec2(11.0, 0.0));
                vPosition.z = 1.0; // 选点，提示固定不透明
            } else if ( isLightColor ) {
                vColor = vec4(1.0, 1.0, 1.0, 0.2);
            } else if ( isWatermark ) {
                vColor = waterMarkColor;
            } else {
                vColor = vec4( float(cov3d.w & 0xFFu) / 255.0, float((cov3d.w >> 8) & 0xFFu) / 255.0, float((cov3d.w >> 16) & 0xFFu) / 255.0, (float(cov3d.w >> 24) / 255.0) * fvAlpha );
                if (shDegree > 0) {
                    vColor.rgb += evalSH(v3Cen);
                }
            }

            vec2 eigenVector2 = vec2(eigenVector1.y, -eigenVector1.x);
            vec2 majorAxis = eigenVector1 * min(sqrt(2.0 * eigenValue1), 1024.0);
            vec2 minorAxis = eigenVector2 * min(sqrt(2.0 * eigenValue2), 1024.0);

            vec2 v2Center = vec2(pos2d) / pos2d.w;  // NDC坐标
            gl_Position = vec4(
                v2Center 
                + vPosition.x * majorAxis / viewport
                + vPosition.y * minorAxis / viewport
                , 1.0, 1.0);

        }
    `;
}

export function getSplatFragmentShader() {
    return `
        precision highp float;
        uniform float lightFactor;
        varying vec4 vColor;
        varying vec3 vPosition;

        void main(){
            float dtPos = -dot(vPosition.xy, vPosition.xy);
            if (dtPos < -4.0) discard;

            dtPos = vPosition.z >= 1.0 ? 1.0 : exp(dtPos) * vColor.a;
             gl_FragColor = vec4(lightFactor * vColor.rgb, dtPos);
        }

    `;
}
