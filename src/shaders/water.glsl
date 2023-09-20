varying vec2 v_Uvs;

void main() {
    vec4 localPosition = vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * localPosition;
    v_Uvs = uv;
}