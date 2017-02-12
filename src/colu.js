var util = require('util')
var events = require('events')
var async = require('async')
var request = require('request')

var ColoredCoins = require('coloredcoins-sdk')

var mainnetColuHost = 'https://engine.colu.co'
var testnetColuHost = 'https://testnet-engine.colu.co'

var sendingMethods = ['address', 'phone_number', 'phoneNumber', 'facebook', 'facebookId', 'email', 'user_id', 'userId']

var Colu = function (settings) {
  var self = this
  settings = settings || {}
  if (settings.network === 'testnet') {
    settings.coluHost = self.coluHost = settings.coluHost || testnetColuHost
    self.network_name = 'testnet'
  } else {
    settings.coluHost = self.coluHost = settings.coluHost || mainnetColuHost
    self.network_name = 'mainnet'
  }
  self.apiKey = settings.apiKey
  self.coloredCoins = new ColoredCoins(settings)
  self.hdwallet = self.coloredCoins.hdwallet
}

util.inherits(Colu, events.EventEmitter)

Colu.encryptPrivateKey = ColoredCoins.encryptPrivateKey
Colu.decryptPrivateKey = ColoredCoins.decryptPrivateKey
Colu.createNewKey = ColoredCoins.createNewKey

Colu.prototype.init = function (cb) {
  var self = this

  function handleError (err) {
    self.emit('error')
    if (cb) return cb(err)
  }

  self.coloredCoins.init(function (err) {
    if (err) return handleError(err)
    self.emit('connect')
    if (cb) cb()
  })
}

Colu.prototype.buildTransaction = function (type, args, cb) {
  var dataParams = {
    cc_args: args
  }
  var path = this.coluHost + '/build_finance_' + type
  var apiKey = args.token || this.apiKey
  if (this.network_name === 'mainnet' && !apiKey) {
    return cb('Must have apiKey/Token and/or set network to testnet.')
  }
  if (apiKey) {
    dataParams.token = apiKey
  }
  request.post(path, {json: dataParams}, function (err, response, body) {
    if (err) return cb(err)
    if (!response || response.statusCode !== 200) return cb(body)
    cb(null, body)
  })
}

Colu.prototype.signAndTransmit = function (assetInfo, callback) {
  var self = this
  async.waterfall([
    function (cb) {
      self.sign(assetInfo.txHex, cb)
    },
    function (signedTxHex, cb) {
      self.transmit(signedTxHex, assetInfo.financeTxid, cb)
    }
  ],
  function (err, resp) {
    if (err) return callback(err)
    assetInfo.txid = resp.txid2.txid
    callback(null, assetInfo)
  })
}

Colu.prototype.sign = function (txHex, callback) {
  this.hdwallet.sign(txHex, callback)
}

Colu.prototype.transmit = function (signedTxHex, lastTxid, attempts, callback) {
  var self = this
  if (typeof attempts === 'function') {
    callback = attempts
    attempts = 0
  }
  if (attempts >= 10) {
    return callback('Cannot transmit the transaction')
  }
  if (attempts) {
    console.log('trying to transmit for the ' + (attempts + 1) + ' attempts')
  }
  var dataParams = {
    last_txid: lastTxid,
    tx_hex: signedTxHex
  }
  var path = this.coluHost + '/transmit_financed'
  request.post(path, { json: dataParams }, function (err, response, body) {
    if (err) return callback(err)
    if (!response || response.statusCode !== 200) {
      var assetInfo = body.assetInfo
      if (assetInfo) {
        return self.transmit(assetInfo.txHex, assetInfo.financeTxid, attempts + 1, callback)
      }
    }
    callback(null, body)
  })
}

Colu.prototype.issueAsset = function (args, callback) {
  var self = this

  var privateKey
  var publicKey
  var receivingAddresses
  var financeTxid
  var transmit = args.transmit !== false
  args.transfer = args.transfer || []
  var hdwallet = self.hdwallet

  async.waterfall([
    // Build finance transaction.
    function (cb) {
      if (!args.issueAddress) return cb(null, hdwallet.getPrivateKey(args.accountIndex))
      hdwallet.getAddressPrivateKey(args.issueAddress, cb)
    },
    function (priv, cb) {
      privateKey = priv
      publicKey = privateKey.pub
      args.issueAddress = args.issueAddress || publicKey.getAddress(self.hdwallet.network).toString()

      var sendingAmount = parseInt(args.amount, 10)
      args.transfer.forEach(function (to) {
        var sendingMethod = null
        Object.keys(to).forEach(function (key) {
          if (~sendingMethods.indexOf(key)) {
            sendingMethod = key
          }
        })
        if (!sendingMethod) {
          to.address = args.issueAddress
        }
        sendingAmount -= parseInt(to.amount, 10)
      })
      if (sendingAmount > 0) {
        args.transfer.push({
          address: args.issueAddress,
          amount: sendingAmount
        })
      }

      receivingAddresses = args.transfer
      args.flags = args.flags || {}
      args.flags.injectPreviousOutput = true
      self.buildTransaction('issue', args, cb)
    },
    function (assetInfo, cb) {
      if (typeof assetInfo === 'function') return assetInfo('wrong server response')
      if (!assetInfo || !assetInfo.txHex) return cb('wrong server response')
      financeTxid = assetInfo.financeTxid
      if (!transmit) {
        return self.sign(assetInfo.txHex, cb)
      }
      self.signAndTransmit(assetInfo, cb)
    },
    function (res, cb) {
      if (!transmit) {
        return cb(null, {financeTxid: financeTxid, signedTxHex: res})
      }
      res.receivingAddresses = receivingAddresses
      res.issueAddress = args.issueAddress
      cb(null, res)
    }
  ],
  callback)
}

Colu.prototype.sendAsset = function (args, callback) {
  var self = this
  var transmit = args.transmit !== false
  var financeTxid
  async.waterfall([
    // Build finance transaction.
    function (cb) {
      if ((!args.from || !Array.isArray(args.from) || !args.from.length) && (!args.sendutxo || !Array.isArray(args.sendutxo) || !args.sendutxo.length)) {
        return cb('Should have from as array of addresses or sendutxo as array of utxos.')
      }
      args.flags = args.flags || {}
      args.flags.injectPreviousOutput = true
      self.buildTransaction('send', args, cb)
    },
    function (assetInfo, cb) {
      financeTxid = assetInfo.financeTxid
      if (!transmit) {
        return self.sign(assetInfo.txHex, cb)
      }
      self.signAndTransmit(assetInfo, cb)
    },
    function (res, cb) {
      if (!transmit) {
        return cb(null, {financeTxid: financeTxid, signedTxHex: res})
      }
      cb(null, res)
    }
  ],
  callback)
}

Colu.prototype.burnAsset = function (args, callback) {
  var self = this
  var transmit = args.transmit !== false
  var financeTxid
  args.transfer = args.transfer || []

  async.waterfall([
    // Build finance transaction.
    function (cb) {
      if ((!args.from || !Array.isArray(args.from) || !args.from.length) && (!args.sendutxo || !Array.isArray(args.sendutxo) || !args.sendutxo.length)) {
        return cb('Should have from as array of addresses or sendutxo as array of utxos.')
      }
      args.transfer.forEach(function (to) {
        var sendingMethod = null
        Object.keys(to).forEach(function (key) {
          if (~sendingMethods.indexOf(key)) {
            sendingMethod = key
          }
        })
        if (!sendingMethod) {
          return cb('Received invalid transfer element: can\'t find who to send to')
        }
      })
      args.flags = args.flags || {}
      args.flags.injectPreviousOutput = true
      self.buildTransaction('burn', args, cb)
    },
    function (assetInfo, cb) {
      financeTxid = assetInfo.financeTxid
      if (!transmit) {
        return self.sign(assetInfo.txHex, cb)
      }
      self.signAndTransmit(assetInfo, cb)
    },
    function (res, cb) {
      if (!transmit) {
        return cb(null, {financeTxid: financeTxid, signedTxHex: res})
      }
      cb(null, res)
    }
  ],
  callback)
}

Colu.prototype.getAssets = function (callback) {
  this.coloredCoins.getAssets(callback)
}

Colu.prototype.getTransactions = function (addresses, callback) {
  this.coloredCoins.getTransactions(addresses, callback)
}

Colu.prototype.getTransactionsFromAddresses = function (addresses, callback) {
  this.coloredCoins.getTransactionsFromAddresses(addresses, callback)
}

Colu.prototype.getAssetMetadata = function (assetId, utxo, full, callback) {
  this.coloredCoins.getAssetMetadata(assetId, utxo, full, callback)
}

Colu.prototype.on = function (eventKey, callback) {
  this.coloredCoins.on(eventKey, callback)
}

Colu.prototype.onRevertedTransaction = function (callback) {
  this.coloredCoins.onRevertedTransaction(callback)
}

Colu.prototype.onRevertedCCTransaction = function (callback) {
  this.coloredCoins.onRevertedCCTransaction(callback)
}

Colu.prototype.onNewTransaction = function (callback) {
  this.coloredCoins.onNewTransaction(callback)
}

Colu.prototype.onNewCCTransaction = function (callback) {
  this.coloredCoins.onNewCCTransaction(callback)
}

Colu.prototype.getIssuedAssetsFromTransactions = function (addresses, transactions) {
  return this.coloredCoins.getIssuedAssetsFromTransactions(addresses, transactions)
}

Colu.prototype.getIssuedAssets = function (transactions, callback) {
  this.coloredCoins.getIssuedAssets(transactions, callback)
}

module.exports = Colu
