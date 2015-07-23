var util = require('util')
var events = require('events')
var async = require('async')
var request = require('request')

var HDWallet = require('hdwallet')
var ColoredCoins = require('coloredcoinsd-wraper')

var coluHost = 'https://engine.colu.co'
var FEE = 1000

var Colu = function (settings) {
  var self = this

  settings = settings || {}
  self.coluHost = settings.coluHost || coluHost
  self.hdwallet = new HDWallet(settings)
  self.coloredCoins = new ColoredCoins(settings)

  self.hdwallet.on('connect', function () {
    self.emit('connect')
  })

  self.hdwallet.on('error', function (err) {
    self.emit('error', err)
  })
}

var signAndTransmit = function (txHex, privateKey ,last_txid, host, cb) {
  var signedTxHex = ColoredCoins.signTx(txHex, privateKey)
  var data_params = {
    last_txid: last_txid,
    tx_hex: signedTxHex
  }
  request.post(host + '/transmit_financed', {form: data_params }, cb)
}

var askForFinance = function (company_public_key, purpose ,amount, host, cb) {
  var data_params = {
    company_public_key: company_public_key,
    purpose: purpose,
    amount: amount
  }
  request.post(host + '/ask_for_finance', {form: data_params}, cb)
}

util.inherits(Colu, events.EventEmitter)

Colu.prototype.init = function () {
  var self = this

  self.hdwallet.init()
}

Colu.prototype.financedIssue = function (args, callback) {
  var self = this

  var privateKey
  var publicKey
  var last_txid
  var assetInfo
  var receivingAddresses
  args.fee = FEE

  async.waterfall([
    // Ask for finance.
    function (cb) {
      if (!args.issueAddress) {
        cb(null, self.hdwallet.getPrivateKey(args.accountIndex))
      }
      else {
        self.hdwallet.getAddressPrivateKey(args.issueAddress, cb)
      }
    },
    function (priv, cb) {
      privateKey = priv
      publicKey = privateKey.pub
      args.issueAddress = publicKey.getAddress(self.hdwallet.network).toString()
      askForFinance(publicKey.toHex(), 'Issue', args.fee + FEE, self.coluHost ,cb)
    },
    function (response, body, cb) {
      if (response.statusCode !== 200) {
        return cb(body)
      }
      body = JSON.parse(body)
      last_txid = body.txid

      args.financeOutputTxid = last_txid
      args.financeOutput = body.vout

      var sendingAmount = parseInt(args.amount)
      if (args.transfer) {
        args.transfer.forEach(function (to) {
          if (!to.address) {
            to.address = args.issueAddress
          }
          sendingAmount-= parseInt(to.amount)
        })
        if (sendingAmount > 0) {
          args.transfer.push({
            address: args.issueAddress,
            amount: sendingAmount
          })
        }
      }
      else {
        args.transfer = [{
          address: args.issueAddress,
          amount: sendingAmount
        }]
      }
      receivingAddresses = args.transfer
      return self.coloredCoins.issue(args, cb)
    },
    function (l_assetInfo, cb) {
      assetInfo = l_assetInfo
      signAndTransmit(assetInfo.txHex, privateKey ,last_txid, self.coluHost, cb)
    },
    function (response, body, cb) {
      if (response.statusCode !== 200) {
        return cb(body)
      }
      // console.log('transmited')
      body = JSON.parse(body)
      assetInfo.txid = body.txid2.txid
      assetInfo.receivingAddresses = receivingAddresses
      assetInfo.issueAddress = args.issueAddress
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
      askForFinance(publicKey.toHex(), 'Send', args.fee + FEE, self.coluHost ,cb)
    },
    function (response, body, cb) {
      if (response.statusCode !== 200) {
        return cb(body)
      }
      body = JSON.parse(body)
      last_txid = body.txid
      args.financeOutputTxid = last_txid
      args.financeOutput = body.vout
      return self.coloredCoins.sendasset(args, cb)
    },
    function (l_sendInfo, cb) {
      sendInfo = l_sendInfo
      signAndTransmit(sendInfo.txHex, privateKey ,last_txid, self.coluHost, cb)
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
