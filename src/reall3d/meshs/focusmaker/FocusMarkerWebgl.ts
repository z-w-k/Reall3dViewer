// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
export function getFocusMarkerVertexShader() {
    return `
        uniform vec2 viewport;

        varying float projectedRadius;
        varying float vAngle;

        void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position.xyz, 1.0);
            vec4 viewCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);

            vec4 ndcPosition = projectionMatrix * viewPosition;
            ndcPosition = ndcPosition * vec4(1.0 / ndcPosition.w);
            vec4 ndcCenter = projectionMatrix * viewCenter;
            ndcCenter = ndcCenter * vec4(1.0 / ndcCenter.w);
            projectedRadius = length((vec2(ndcPosition) * viewport) - (vec2(ndcCenter) * viewport));

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
        uniform vec2 viewport;
        uniform float opacity;

        varying float projectedRadius;
        varying float vAngle;

        void main() {
            float lineWidth = 0.001 * viewport.y;
            float aaRange = 0.0025 * viewport.y;
            float radius = 0.06 * viewport.y;
            float radDiff = abs(projectedRadius - radius) - lineWidth;
            float alpha = 1.0 - clamp(radDiff / 5.0, 0.0, 1.0);

            // 将圆分成3段显示
            float segmentAngle = 120.0;
            if (mod(vAngle, segmentAngle) > segmentAngle * 0.8) {
                alpha = 0.0;
            }

            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * opacity);
        }
    `;
}
