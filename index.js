var parseIrc = require('parse-irc')
  , net = require('net')
  , inherits = require('util').inherits
  , through = require('through2')
  , Duplex = require('stream').Duplex

module.exports = function(port, host, options) {
  return new Irk(port, host, options)
}

inherits(Irk, Duplex)
function Irk(port, host, options) {
  if (!port || !host) {
    throw new Error('port and host are required')
  }

  this._reader = parseIrc()
  this._writer = createMessageToTextStream()
  Duplex.call(this)
  this._readableState = this._reader._readableState
  this._writableState = this._writer._writableState

  this._reader.on('error', this.emit.bind(this))
  this._writer.on('error', this.emit.bind(this))

  this.port = port
  this.host = host
  this.options = options || {}

  this.connecting = false
  this.connected = false
  this._connect()
}

Irk.prototype._connect = function() {
  this._connection = net.connect(this.port, this.host)
  this.connecting = true

  var self = this
  this._connection.on('connect', function() {
    self.connected = true
    self.connecting = false
    self._writer.pipe(self._connection).pipe(self._reader)
    self._reader.read(0)
    self._writer.read(0)
    self._connection.read(0)
    self.emit('connect')
  }).on('close', function(hadError) {
    self.connected = false
    self.connection = null
    self.emit('close', hadError)
  }).on('error', function(err) {
    self.emit('error', err)
  }).on('timeout', function() {
    self.emit('timeout')
  })
}

function genEventEmitterMethod(method) {
  return function(ev, fn) {
    switch (ev) {
      case 'data':
      case 'end':
      case 'readable':
        return this._reader[method](ev, fn)
      case 'drain':
      case 'finish':
        return this._writer[method](ev, fn)
      default:
        return Duplex.prototype[method].call(this, ev, fn)
    }
  }
}

;['addListener', 'on', 'once', 'removeListener', 'removeAllListeners',
    'listeners'].forEach(function(method) {
  Irk.prototype[method] = genEventEmitterMethod(method)
})

Irk.prototype.pipe = function(dest, opts) {
  return this._reader.pipe(dest, opts)
}

Irk.prototype.setEncoding = function(enc) {
  return this._reader.setEncoding(enc)
}

Irk.prototype.read = function(size) {
  return this._reader.read(size)
}

Irk.prototype.end = function(chunk, enc, cb) {
  return this._writer.end(chunk, enc, cb)
}

Irk.prototype.write = function(chunk, enc, cb) {
  return this._writer.write(chunk, enc, cb)
}

function createMessageToTextStream() {
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
