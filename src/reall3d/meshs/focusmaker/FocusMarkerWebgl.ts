// ================================
// Copyright (c) 2025 reall3d.com
// ================================
export function getFocusMarkerVertexShader() {
    return `
        uniform vec2 viewport;
        uniform vec3 realFocusPosition;

        varying vec4 ndcPosition;
        varying vec4 ndcCenter;
        varying vec4 ndcFocusPosition;
        varying float vAngle;
        
        void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position.xyz, 1.0);
            vec4 viewCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);

            vec4 viewFocusPosition = modelViewMatrix * vec4(realFocusPosition, 1.0);

            ndcPosition = projectionMatrix * viewPosition;
            ndcPosition = ndcPosition * vec4(1.0 / ndcPosition.w);
            ndcCenter = projectionMatrix * viewCenter;
            ndcCenter = ndcCenter * vec4(1.0 / ndcCenter.w);

            ndcFocusPosition = projectionMatrix * viewFocusPosition;
            ndcFocusPosition = ndcFocusPosition * vec4(1.0 / ndcFocusPosition.w);

            
            // 计算角度
            vec2 screenPosition = vec2(ndcPosition) * viewport;
            vec2 screenCenter = vec2(ndcCenter) * viewport;
            vec2 screenVec = screenPosition - screenCenter;
            float angle = atan(screenVec.y, screenVec.x);

            // 将角度从弧度转换为度数
            vAngle = angle * (180.0 / 3.14159265) + 90.0;
            
            gl_Position = projectionMatrix * viewPosition;

        }
    `;
}

export function getFocusMarkerFragmentShader() {
    return `
        uniform vec3 cycleColor;
        uniform vec2 viewport;
        uniform float opacity;

        varying vec4 ndcPosition;
        varying vec4 ndcCenter;
        varying vec4 ndcFocusPosition;
        varying float vAngle;

        void main() {
            vec2 screenPosition = vec2(ndcPosition) * viewport;
            vec2 screenCenter = vec2(ndcCenter) * viewport;

            vec2 screenVec = screenPosition - screenCenter;

            float projectedRadius = length(screenVec);

            float lineWidth = 0.0005 * viewport.y;
            float aaRange = 0.0025 * viewport.y;
            float radius = 0.06 * viewport.y;
            float radDiff = abs(projectedRadius - radius) - lineWidth;
            float alpha = 1.0 - clamp(radDiff / 5.0, 0.0, 1.0); 

            // 将圆分成3段显示
            float segmentAngle = 120.0;
            if (mod(vAngle, segmentAngle) > segmentAngle * 0.8) {
                alpha = 0.0;
            }
                
            gl_FragColor = vec4(cycleColor.rgb, alpha * opacity);
        }
    `;
}
