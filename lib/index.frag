uniform vec4 _u_bounds;
uniform vec2 _u_volume;
uniform float _u_slice;

void main() {
  vec2 uv = gl_FragCoord.xy / _u_volume;
  vec2 pos = mix(_u_bounds.xy, _u_bounds.zw, uv.xy);
  float dst = __GEOMETRY__(vec3(pos, _u_slice)) * 2.0 - 1.0;

  gl_FragColor = vec4(dst, dst, dst, 1.0);
}
