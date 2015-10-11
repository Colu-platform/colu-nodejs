var util = require('util')
var events = require('events')
var io = require('socket.io-client')

function Events (args) {
  var self = this

  args = args || {}
  self.host = args.host || ''
  self.rooms = args.rooms || []
  self.socket = io.connect(self.host + '/events')
  self.socket.on('connect', function () {
    self.rooms.forEach(function (room) {
      self.socket.emit('join', room)
    })
  })

  self.rooms.forEach(function (room) {
    self.socket.on(room, function (data) {
      self.emit(room, data)
    })
  })
}

util.inherits(Events, events.EventEmitter)
