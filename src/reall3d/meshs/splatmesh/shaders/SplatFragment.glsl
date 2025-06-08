// ==============================================
// Copyright (c) 2025 reall3d.com, MIT license
// ==============================================
precision highp float;

uniform float lightFactor;
varying vec4 vColor;
varying vec3 vPosition;

void main() {
    float dtPos = -dot(vPosition.xy, vPosition.xy);
    if(dtPos < -4.0)
        discard;

    dtPos = vPosition.z >= 1.0 ? 1.0 : exp(dtPos) * vColor.a;
    gl_FragColor = vec4(lightFactor * vColor.rgb, dtPos);
}
