var util = require('util')
var events = require('events')
var io = require('socket.io-client')

function Events (args) {
  var self = this
  self.channels = ['newblock', 'newtransaction', 'newcctransaction', 'revertedblock', 'revertedtransaction', 'revertedcctransaction']
  self.rooms = [{
    room: 'transaction',
    key: 'txid'
  }, {
    room: 'address',
    key: 'address'
  }, {
    room: 'asset',
    key: 'assetId'
  }]

  args = args || {}
  self.coluHost = args.coluHost
  self.joinedChannels = []
  self.socket = io.connect(self.coluHost + '/events')
  self.socket.on('transaction', function (data) {
    self.rooms.forEach(function (room) {
      if (data[room.key]) {
        self.emit(room.room + '/' + data[room.key], data)
      }
    })
  })
  self.channels.forEach(function (channel) {
    self.socket.on(channel, function (data) {
      self.emit(channel, data)
    })
    self.socket.on('connect', function () {
      console.log('socket', self.socket.id, 'connected')
      if (~self.joinedChannels.indexOf(channel)) {
        self.socket.emit('join', channel)
      }
    })
    self.socket.on('disconnect', function () {
      console.log('socket', self.socket.id, 'disconnect')
    })
    self.socket.on('connect_error', function (err) {
      console.log('socket', self.socket.id, 'connect_error', err)
    })
    self.socket.on('reconnect_error', function (err) {
      console.log('socket', self.socket.id, 'reconnect_error', err)
    })
  })
}

util.inherits(Events, events.EventEmitter)

Events.prototype.join = function (channel) {
  if (~this.joinedChannels.indexOf(channel)) return
  this.joinedChannels.push(channel)
  this.socket.emit('join', channel)
}

Events.prototype.leave = function (channel) {
  if (!~this.joinedChannels.indexOf(channel)) return
  this.joinedChannels.splice(this.joinedChannels.indexOf(channel), 1)
  this.socket.emit('leave', channel)
}

module.exports = Events
