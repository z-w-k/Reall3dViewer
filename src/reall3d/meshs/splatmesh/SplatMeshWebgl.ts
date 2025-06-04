// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
export function getSplatVertexShader() {
    return `
        #include <splat>

        void main () {
            uvec4 cen = splatReadCenter(splatIndex);
            if (!checkFvVisible(cen)) return;
            uvec4 cov3d = splatReadCov3d(splatIndex);
            vec3 v3Cen = uintBitsToFloat(cen.xyz);
            processWatermarkAnimate(cen, v3Cen);
            vec4 cam = modelViewMatrix * vec4(v3Cen, 1.0);
            vec4 pos2d = projectionMatrix * cam;
            if (!checkSplatVisible(cam, pos2d, cen)) return;
            if (!checkProgressiveVisivle(v3Cen)) return;
            if ( processMarkPoint(v3Cen, pos2d) ) return;

            splatProcessWithCov3d(cen, v3Cen, cov3d, cam, pos2d, splatIndex);
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
