var replaceMain = require('./lib/replace-main')
var triangle = require('a-big-triangle')
var fill = require('ndarray-fill')
var Shader = require('gl-shader')
var ndarray = require('ndarray')
var map = require('map-limit')
var FBO = require('gl-fbo')
var path = require('path')
var fs = require('fs')

module.exports = getBounds

var vert = fs.readFileSync(path.join(__dirname, 'lib', 'index.vert'), 'utf8')
var read = fs.readFileSync(path.join(__dirname, 'lib', 'index.frag'), 'utf8')

function getBounds (gl, source, options, done) {
  if (typeof options === 'function') {
    done = options
    options = {}
  }

  var fnName = options.functionName || 'geometry'
  var volume = options.volume || [32, 32, 32]
  var bounds = options.bounds || 2
  var frag = replaceMain(source, read.replace(/__GEOMETRY__/g, fnName))
  var shader = Shader(gl, vert, frag)

  if (Array.isArray(volume)) {
    volume = ndarray(new Float32Array(
      volume[0] *
      volume[1] *
      volume[2]
    ), volume)
  }

  if (typeof bounds === 'number') {
    bounds /= 2
    bounds = [[-bounds, -bounds, -bounds], [bounds, bounds, bounds]]
  } else
  if (!Array.isArray(bounds)) {
    throw new Error(
      'Volume bounds must be specified as either an array or number'
    )
  }

  if (!Array.isArray(bounds[0])) bounds[0] = [bounds[0], bounds[0], bounds[0]]
  if (!Array.isArray(bounds[1])) bounds[1] = [bounds[1], bounds[1], bounds[1]]

  var sliceSize = [volume.shape[0], volume.shape[1]]
  var sliceCount = volume.shape[2]
  var sliceBounds = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]

  var fbos = []
  var main = FBO(gl, sliceSize)
  for (var i = 0; i < sliceCount; i++) {
    fbos.push(i / (sliceCount - 1))
  }

  map(fbos, 1, function (t, next) {
    var fbo = main

    var prevBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) || null
    var prevDepth = !!gl.getParameter(gl.DEPTH_TEST)
    var prevCull = !!gl.getParameter(gl.CULL_FACE)
    var prevViewport = gl.getParameter(gl.VIEWPORT)

    shader.bind()
    shader.uniforms._u_bounds = sliceBounds
    shader.uniforms._u_volume = sliceSize
    shader.uniforms._u_slice = bounds[0][2] + (bounds[1][2] - bounds[0][2]) * t

    fbo.bind()
    gl.viewport(0, 0, sliceSize[0], sliceSize[1])
    triangle(gl)

    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3])
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevBuffer)
    prevDepth ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST)
    prevCull ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE)

    window.requestAnimationFrame(function () {
      var prevBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) || null
      var data = new Uint8Array(sliceSize[0] * sliceSize[1] * 4)

      fbo.bind()
      gl.readPixels(0, 0, sliceSize[0], sliceSize[1], gl.RGBA, gl.UNSIGNED_BYTE, data)
      gl.bindFramebuffer(gl.FRAMEBUFFER, prevBuffer)

      next(null, data)
    })
  }, function (err, slices) {
    if (err) throw err

    fill(volume, function (x, y, z) {
      return slices[z][(x + y * sliceSize[0]) * 4]
    })

    done(null, volume)
  })
}
