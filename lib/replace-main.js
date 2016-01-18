var toString = require('glsl-token-string')
var tokenize = require('glsl-tokenizer')

module.exports = replaceMain

function replaceMain (src, newMain) {
  var tokens = tokenize(src)

  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i].data !== 'main') continue

    var t = i
    while (t-- > 0) {
      if (tokens[t].type !== 'whitespace') break
    }

    if (tokens[t].data !== 'void') continue

    var depth = 0
    for (var j = t; j < tokens.length; j++) {
      var data = tokens[j].data
      if (data === '{') { depth++; continue }
      if (data === '}') {
        if (!--depth) break
      }
    }

    tokens.splice(t, j + 1 - t, {
      data: newMain
    })

    return toString(tokens)
  }

  return src + '\n\n' + newMain
}
