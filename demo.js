var surfaceNets = require('surface-nets')
var normals = require('face-normals')
var unindex = require('unindex-mesh')
var Shader = require('gl-shader')
var Geom = require('gl-geometry')
var mat4 = require('gl-mat4')

var canvas = document.body.appendChild(document.createElement('canvas'))
var gl = canvas.getContext('webgl')
var shader = Shader(gl, `
  precision mediump float;

  attribute vec3 position;
  attribute vec3 normal;
  varying vec3 vnorm;
  uniform mat4 proj;
  uniform mat4 view;

  void main() {
    vnorm = normal;
    gl_Position = proj * view * vec4(position, 1);
  }
`, `
  precision mediump float;

  varying vec3 vnorm;

  void main() {
    gl_FragColor = vec4(normalize(vnorm) * 0.5 + 0.5, 1);
  }
`)

require('./')(gl, `
precision mediump float;

float geometry(vec3 p) {
  float d1 = p.y - cos(p.z * 5.) * sin(p.x * 5.) * 0.15 + 0.5;
  float d2 = length(p) - 0.125;

  return min(d1, d2);
}
`, {
  volume: [64, 64, 64]
}, function (err, volume) {
  if (err) throw err

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  var proj = mat4.create()
  var view = mat4.create()
  var mesh = surfaceNets(volume, 0.9)
  var positions = unindex(mesh)
  var geom = Geom(gl)
    .attr('position', positions)
    .attr('normal', normals(positions))

  render()
  function render () {
    window.requestAnimationFrame(render)

    var width = canvas.width
    var height = canvas.height

    gl.viewport(0, 0, width, height)
    gl.clearColor(1, 1, 1, 1)

    mat4.perspective(proj, Math.PI / 4, width / height, 0.2, 300)
    mat4.lookAt(view, [Math.sin(Date.now() / 1000) * 20, 70, -40], [32, 32, 32], [0, 1, 0])

    geom.bind(shader)
    shader.uniforms.proj = proj
    shader.uniforms.view = view
    geom.draw()
  }
})

window.addEventListener('resize', require('canvas-fit')(canvas), false)
