var irk = require('../')
  , through = require('through2')

var client = irk(6667, 'irc.freenode.net')

var objectToJsonStream = through(function(obj, enc, cb) {
  this.push('>> ' + JSON.stringify(obj) + '\n')
  cb()
})
objectToJsonStream._writableState.objectMode = true

client.pipe(objectToJsonStream).pipe(process.stdout)
client.on('connect', function() {
  console.log('connected')
}).on('close', function() {
  console.log('disconnected')
})
