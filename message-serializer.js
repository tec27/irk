var through = require('through2')

module.exports = function() {
  var stream = through(function(msg, enc, cb) {
    if (!msg.command) {
      return cb(new Error('IRC message must specify a command'))
    }

    var msgAsText = ''
    if (msg.prefix) {
      msgAsText += ':' + msg.prefix + ' '
    }
    msgAsText += msg.command

    if (msg.params && msg.params.length) {
      var joinedParams = msg.params
        , lastParam = msg.params[msg.params.length - 1]
        , hasTrailing = lastParam.indexOf(' ') > -1
      if (hasTrailing) {
        joinedParams = msg.params.slice(0, msg.params.length - 1)
      }

      if (joinedParams.length) {
        msgAsText += ' ' + joinedParams.join(' ')
      }
      if (hasTrailing) {
        msgAsText += ':' + lastParam
      }
    }

    this.push(msgAsText + '\r\n')
    cb()
  })

  stream._writableState.objectMode = true
  return stream
}
