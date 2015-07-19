var util = require('util')
var events = require('events')
var async = require('async')
var request = require('request')

var HDWallet = require('hdwallet')
var CC = require('coloredcoinsd-wraper')

var coluHost = 'https://engine.colu.co'
var FEE = 1000

Colu = function (args) {
  var self = this

  self.coluHost = args.coluHost || coluHost

  self.hdwallet = new HDWallet(args)
  self.cc = new CC(args)

  self.hdwallet.on('connect', function () {
    self.emit('connect')
  })

  self.hdwallet.on('error', function (err) {
    self.emit('error', err)
  })
}

util.inherits(Colu, events.EventEmitter)

Colu.prototype.init = function () {
  var self = this

  self.hdwallet.init()
}

Colu.prototype.financedIssue = function (args, callback) {
  var self = this

  var privateKey = self.hdwallet.getPrivateKey(args.accountIndex)
  var publicKey = privateKey.pub
  var last_txid
  var assetInfo
  args.fee = args.fee || FEE

  async.waterfall([
    // Ask for finance.
    function (cb) {
      var data_params = {
        company_public_key: publicKey.toHex(),
        purpose: 'Issue',
        amount: args.fee + FEE
      }
      request.post(self.coluHost + '/ask_for_finance',
      {form: data_params },
      cb)
    },
    function (response, body, cb) {
      if (response.statusCode !== 200) {
        return cb(body)
      }
      body = JSON.parse(body)
      last_txid = body.txid

      args.financeOutputTxid = last_txid
      args.financeOutput = body.vout
      args.issueAddress = publicKey.getAddress(self.hdwallet.network).toString()

      if (args.transfer) {
        args.transfer.forEach(function (to) {
          if (!to.address) {
            to.address = publicKey.getAddress(self.hdwallet.network).toString()
          }
        })
      }

      return self.cc.issue(args, cb)
    },
    function (l_assetInfo, cb) {
      assetInfo = l_assetInfo
      var signedTxHex = CC.signTx(assetInfo.txHex, privateKey)
      // console.log('signTx: ' + signedTxHex)
      var data_params = {
        last_txid: last_txid,
        tx_hex: signedTxHex
      }
      request.post(self.coluHost + '/transmit_financed',
      {form: data_params },
      cb)
    },
    function (response, body, cb) {
      if (response.statusCode !== 200) {
        return cb(body)
      }
      // console.log('transmited')
      body = JSON.parse(body)
      assetInfo.txid = body.txid2.txid
      cb(null, assetInfo)
    }
  ],
  callback)
}

Colu.prototype.financedSend = function (args, callback) {
  var self = this

  var privateKey
  var publicKey
  var last_txid
  var sendInfo
  args.fee = args.fee || FEE

  async.waterfall([
    function (cb) {
      self.hdwallet.getAddressPrivateKey(args.from, cb)
    },
    // Ask for finance.
    function (priv, cb) {
      privateKey = priv
      publicKey = privateKey.pub
      var data_params = {
        company_public_key: publicKey.toHex(),
        purpose: 'Send',
        amount: args.fee + FEE
      }
      request.post(self.coluHost + '/ask_for_finance',
      {form: data_params },
      cb)
    },
    function (response, body, cb) {
      if (response.statusCode !== 200) {
        return cb(body)
      }
      body = JSON.parse(body)
      last_txid = body.txid
      args.financeOutputTxid = last_txid
      args.financeOutput = body.vout
      return self.cc.sendasset(args, cb)
    },
    function (l_sendInfo, cb) {
      sendInfo = l_sendInfo
      var signedTxHex = CC.signTx(sendInfo.txHex, privateKey)
      // console.log('signTx: ' + signedTxHex)
      var data_params = {
        last_txid: last_txid,
        tx_hex: signedTxHex
      }
      request.post(self.coluHost + '/transmit_financed',
      {form: data_params },
      cb)
    },
    function (response, body, cb) {
      if (response.statusCode !== 200) {
        return cb(body)
      }
      // console.log('transmited')
      body = JSON.parse(body)
      sendInfo.txid = body.txid2.txid
      cb(null, sendInfo)
    }
  ],
  callback)
}

module.exports = Colu
