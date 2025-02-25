// ================================
// Copyright (c) 2025 reall3d.com
// ================================
export function getSplatVertexShader() {
    return `
        precision highp float;

        uniform highp usampler2D splatTexture0, splatTexture1;
        uniform vec2 focal, viewport;
        uniform int usingIndex, pointMode, bigSceneMode, showWaterMark, debugEffect;
        uniform float topY, currentVisibleRadius, currentLightRadius, performanceNow;
        uniform vec4 markPoint, waterMarkColor;

        attribute uint splatIndex;

        varying vec4 vColor;
        varying vec3 vPosition;

        void main () {
            uvec4 cen, cov3d;
            if (bigSceneMode == 1) {
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
 
            int waterMarkValue = int((cen.w & 65536u) >> 16u);
            int cenState = int(cen.w & 65535u);

            vec3 v3Cen = uintBitsToFloat(cen.xyz);

            if ( waterMarkValue == 1 && debugEffect == 1) {
                // 水印动画
                v3Cen.y += sin(performanceNow*0.002 + v3Cen.x) * 0.1;
            }

            vec4 cam = modelViewMatrix * vec4(v3Cen, 1.0);
            vec4 pos2d = projectionMatrix * cam;
            float clip = 1.2 * pos2d.w;
            if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip
                || waterMarkValue == 1 && (showWaterMark == 0 || pointMode == 1) ) {
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

            int lightColorFlag = 0;
            if ( waterMarkValue == 0 ) {
                if ( pointMode == 1 ) {
                    eigenValue1 = eigenValue2 = 0.5;
                }

                if ( bigSceneMode == 0 && currentLightRadius > 0.0 ) {
                    // 仅小场景支持光圈过渡效果
                    if ( currentRadius < currentLightRadius && currentRadius > currentLightRadius * 0.9 ) {
                        eigenValue1 = eigenValueOrig1;
                        eigenValue2 = eigenValueOrig2;
                        lightColorFlag = 1;
                    }
                    if ( currentRadius < currentLightRadius * 0.9 ){
                        if ( pointMode == 1 ){
                            eigenValue1 = eigenValueOrig1;
                            eigenValue2 = eigenValueOrig2;
                        } else {
                            eigenValue1 = eigenValue2 = 0.5;
                        }
                    }
                }
            }
            

            int iSelectPoint = 0;
            if (markPoint.w > 0.0 && length(vec3(markPoint.xyz) - v3Cen) < 0.000001){
                iSelectPoint = 1;
            }

            vPosition = vec3(position.xy, -1.0);
            vec2 eigenVector1 = normalize(vec2(cov2Dv.y, eigenValue1 - cov2Dv.x));
            if (iSelectPoint == 1){
                vColor = vec4(1.0, 1.0, 0.0, 1.0);
                eigenValue1 = eigenValue2 = 10.0;
                eigenVector1 = normalize(vec2(10.0, eigenValue1 - 10.0));
                vPosition.z = 1.0;
            } else if ( lightColorFlag == 1 ) {
                vColor = vec4(1.0, 1.0, 1.0, 0.2);
            } else {
                vColor = vec4( float(cov3d.w & uint(0xFF)) / 255.0, float((cov3d.w >> 8) & uint(0xFF)) / 255.0, float((cov3d.w >> 16) & uint(0xFF)) / 255.0, float(cov3d.w >> 24) / 255.0 );
            }

            if (showWaterMark == 1 && waterMarkValue == 1) {
                vColor = waterMarkColor;
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

            dtPos = vPosition.z > 0.0 ? 1.0 : exp(dtPos) * vColor.a;
             gl_FragColor = vec4(lightFactor * vColor.rgb, dtPos);
        }

    `;
}
