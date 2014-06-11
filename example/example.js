var irk = require('../')
  , objectify = require('through2-objectify')

var client = irk(6667, 'irc.freenode.net')

var objectToJsonStream = objectify.deobj(function(obj, enc, cb) {
  this.push('>> ' + JSON.stringify(obj) + '\n')
  cb()
})

client.pipe(objectToJsonStream).pipe(process.stdout)
client.on('connect', function() {
  console.log('connected')
}).on('close', function() {
  console.log('disconnected')
})
