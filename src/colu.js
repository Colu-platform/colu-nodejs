var util = require('util')
var events = require('events')
var async = require('async')
var request = require('request')

var DataStorage = require('data-storage')
var HDWallet = require('hdwallet')
var ColoredCoins = require('coloredcoinsd-wraper')
var Events = require('./events.js')

var mainnetColuHost = 'https://engine.colu.co'
var testnetColuHost = 'https://testnet.engine.colu.co'

var Colu = function (settings) {
  var self = this
  self.initiated = false
  settings = settings || {}
  if (settings.network === 'testnet') {
    settings.coluHost = self.coluHost = settings.coluHost || testnetColuHost
  } else {
    settings.coluHost = self.coluHost = settings.coluHost || mainnetColuHost
  }
  self.apiKey = settings.apiKey
  if (self.coluHost === mainnetColuHost) {
    if (!settings.apiKey) throw new Error('Must have apiKey and/or set network to testnet')
  }
  self.redisPort = settings.redisPort || 6379
  self.redisHost = settings.redisHost || '127.0.0.1'
  self.redisUrl = settings.redisUrl
  self.hdwallet = new HDWallet(settings)
  self.coloredCoins = new ColoredCoins(settings)
  self.network = self.hdwallet.network
  self.eventsSecure = settings.eventsSecure || false
  if (settings.events) {
    self.events = new Events(settings)
    self.listenersAddtesses = {}
  }
  self.addresses = []
}

util.inherits(Colu, events.EventEmitter)

Colu.encryptPrivateKey = HDWallet.encryptPrivateKey
Colu.decryptPrivateKey = HDWallet.decryptPrivateKey
Colu.createNewKey = HDWallet.createNewKey

Colu.prototype.init = function (cb) {
  var self = this

  var settings = {
    redisPort: self.redisPort,
    redisHost: self.redisHost,
    redisUrl: self.redisUrl
  }
  self.ds = new DataStorage(settings)
  self.ds.once('connect', function () {
    self.afterDSInit(cb)
  })

  self.ds.init()
}

Colu.prototype.afterDSInit = function (cb) {
  var self = this
  self.hdwallet.ds = self.ds
  self.hdwallet.on('connect', function () {
    if (!self.initiated) {
      self.initiated = true
      self.hdwallet.on('registerAddress', function (address) {
        if (!~self.addresses.indexOf(address)) {
          self.addresses.push(address)
        }
      })
      self.hdwallet.getAddresses(function (err, addresses) {
        self.addresses = addresses
        self.emit('connect')
      })
    }
  })

  self.hdwallet.on('error', function (err) {
    self.emit('error', err)
  })

  self.hdwallet.init(function (err, wallet) {
    if (err) {
      if (cb) return cb(err)
      throw err
    }
    if (cb) cb(null, self)
  })
}

Colu.prototype.buildTransaction = function (type, args, cb) {
  var dataParams = {
    cc_args: args
  }
  var path = this.coluHost + '/build_finance_'+type
  if (this.apiKey) path += '?token=' + this.apiKey
  request.post(path, {json: dataParams}, function (err, response, body) {
    if (err) return cb(err)
    if (!response || response.statusCode !== 200) return cb(body)
    cb(null, body)
  })
}

Colu.prototype.signAndTransmit = function (txHex, lastTxid, callback) {
  var self = this

  var addresses = ColoredCoins.getInputAddresses(txHex, self.network)
  if (!addresses) return callback('can\'t find addresses to fund')
  async.map(addresses,
    function (address, cb) {
      self.hdwallet.getAddressPrivateKey(address, cb)
    },
    function (err, privateKeys) {
      if (err) return callback(err)
      var signedTxHex = ColoredCoins.signTx(txHex, privateKeys)
      self.transmit(signedTxHex, lastTxid, callback)
    }
  )
}

Colu.prototype.transmit = function (signedTxHex, lastTxid, callback) {
  var dataParams = {
    last_txid: lastTxid,
    tx_hex: signedTxHex
  },
  path = this.coluHost + '/transmit_financed'
  request.post(path, { json: dataParams }, function (err, response, body) {
    if (err) return callback(err)
    if (!response || response.statusCode !== 200) return callback(body)
    callback(null, body)
  })
}

Colu.prototype.issueAsset = function (args, callback) {
  var self = this

  var privateKey
  var publicKey
  var lastTxid
  var assetInfo
  var receivingAddresses
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
      args.issueAddress = publicKey.getAddress(self.network).toString()

      var sendingAmount = parseInt(args.amount, 10)
      args.transfer.forEach(function (to) {
        to.address = to.address || args.issueAddress
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
    function (info, cb) {
      if (typeof info === 'function') return info('wrong server response')
      if (!info || !info.txHex) return cb('wrong server response')
      assetInfo = info
      lastTxid = assetInfo.financeTxid
      self.signAndTransmit(assetInfo.txHex, lastTxid, cb)
    },
    function (body, cb) {
      assetInfo.txid = body.txid2.txid
      assetInfo.receivingAddresses = receivingAddresses
      assetInfo.issueAddress = args.issueAddress
      cb(null, assetInfo)
    }
  ],
  callback)
}

Colu.prototype.sendAsset = function (args, callback) {
  var self = this

  var lastTxid
  var sendInfo

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
    function (info, cb) {
      sendInfo = info
      lastTxid = sendInfo.financeTxid

      self.signAndTransmit(sendInfo.txHex, lastTxid, cb)
    },
    function (body, cb) {
      sendInfo.txid = body.txid2.txid
      cb(null, sendInfo)
    }
  ],
  callback)
}

Colu.prototype.getAssets = function (callback) {
  var self = this
  self.hdwallet.getAddresses(function (err, addresses) {
    if (err) return callback(err)
    var dataParams = {
      addresses: addresses
    }
    request.post(self.coluHost + '/get_addresses_utxos', {json: dataParams }, function (err, response, body) {
      if (err) return callback(err)
      if (!response || response.statusCode !== 200) return callback(body)
      var utxos = body
      var assets = []
      utxos.forEach(function (addressUtxo) {
        if (addressUtxo.utxos) {
          addressUtxo.utxos.forEach(function (utxo) {
            if (utxo.assets) {
              utxo.assets.forEach(function (asset, i) {
                assets.push({
                  address: addressUtxo.address,
                  txid: utxo.txid,
                  index: utxo.index,
                  assetId: asset.assetId,
                  amount: asset.amount,
                  issueTxid: asset.issueTxid,
                  divisibility: asset.divisibility,
                  lockStatus: asset.lockStatus,
                  assetIndex: i
                })
              })
            }
          })
        }
      })
      callback(null, assets)
    })
  })
}

Colu.prototype.getTransactions = function (callback) {
  var self = this
  self.hdwallet.getAddresses(function (err, addresses) {
    if (err) return callback(err)
    var dataParams = {
      addresses: addresses,
      with_transactions: true
    }
    request.post(self.coluHost + '/get_addresses_info', {json: dataParams }, function (err, response, body) {
      if (err) return callback(err)
      if (!response || response.statusCode !== 200) return callback(body)
      var addressesInfo = body
      var transactions = []
      var txids = []

      addressesInfo.forEach(function (addressInfo) {
        if (addressInfo.transactions) {
          addressInfo.transactions.forEach(function (transaction) {
            if (txids.indexOf(transaction.txis) === -1) {
              transactions.push(transaction)
            }
          })
        }
      })

      callback(null, transactions)
    })
  })
}

Colu.prototype.getAssetMetadata = function (assetId, utxo, full, callback) {
  var self = this
  var metadata
  async.waterfall([
    function (cb) {
      // get the metadata from cache
      getCachedAssetMetadata(self.ds, assetId, utxo, cb)
    },
    function (md, cb) {
      metadata = md
      // if no metadata or full
      if (!metadata || full) {
        // get metadata from cc
        self.coloredCoins.getAssetMetadata(assetId, utxo, function (err, md) {
          if (err) return cb(err)
          metadata = md
          // cache data
          cacheAssetMetadata(self.ds, assetId, utxo, getPartialMetadata(metadata))
          cb()
        })
      } else {
        cb()
      }
    }
  ],
  function (err) {
    if (err) return callback(err)
    // return the metadata (if !full, just the partial)
    var partial = getPartialMetadata(metadata)
    if (!full) {
      metadata = partial
    } else {
      for (var attr in partial) {
        metadata[attr] = partial[attr]
      }
    }
    return callback(null, metadata)
  })
}

var getCachedAssetMetadata = function (ds, assetId, utxo, callback) {
  utxo = utxo || 0
  ds.hget(assetId, utxo, function (err, metadataStr) {
    if (err) return callback(err)
    if (!metadataStr) return callback(null, null)
    return callback(null, JSON.parse(metadataStr))
  })
}

var cacheAssetMetadata = function (ds, assetId, utxo, metadata) {
  utxo = utxo || 0
  ds.hset(assetId, utxo, JSON.stringify(metadata))
}

var getPartialMetadata = function (metadata) {
  var ans = {
    assetId: metadata.assetId
  }
  var utxoMetadata = metadata.metadataOfUtxo || metadata.metadataOfIssuence
  if (utxoMetadata && utxoMetadata.data) {
    ans.assetName = utxoMetadata.data.assetName
    ans.description = utxoMetadata.data.description
    ans.issuer = utxoMetadata.data.issuer
    if (utxoMetadata.data.urls) {
      utxoMetadata.data.urls.forEach(function (url) {
        if (url.name === 'icon') ans.icon = url.url
        if (url.name === 'large_icon') ans.large_icon = url.url
      })
    }
  } else {
    ans.assetName = metadata.assetName
    ans.description = metadata.description
    ans.issuer = metadata.issuer
    ans.icon = metadata.icon
    ans.large_icon = metadata.large_icon
  }
  return ans
}

Colu.prototype.onNewTransaction = function (callback) {
  var self = this

  if (!self.events) return false
  if (self.eventsSecure) {
    self.events.on('newtransaction', function (data) {
      if (self.isLocalTransaction(data.newtransaction)) {
        callback(data.newtransaction)
      }
    })
    self.events.join('newtransaction')
  }
  else {
    var addresses = []
    var transactions = []
    self.hdwallet.on('registerAddress', function (address) {
      self.registerAddress(address, addresses, transactions, callback)
    })
    self.addresses.forEach(function (address) {
      self.registerAddress(address, addresses, transactions, callback)
    })
  }
}

Colu.prototype.onNewCCTransaction = function (callback) {
  var self = this

  if (!self.events) return false
  if (self.eventsSecure) {
    self.events.on('newcctransaction', function (data) {
      if (self.isLocalTransaction(data.newcctransaction)) {
        callback(data.newcctransaction)
      }
    })
    self.events.join('newcctransaction')
  }
  else {
    self.onNewTransaction(function (transaction) {
      if (transaction.colored) {
        callback(transaction)
      }
    })
  }
}

Colu.prototype.isLocalTransaction = function (transaction) {
  var self = this

  var localTx = false
  
  if (!localTx && transaction.vin) {
    transaction.vin.forEach(function (input) {
      if (!localTx && input.previousOutput && input.previousOutput.addresses) {
        input.previousOutput.addresses.forEach(function (address) {
          if (!localTx && ~self.addresses.indexOf(address)) {
            localTx = true
          }
        })
      }
    })
  }

  if (!localTx && transaction.vout) {
    transaction.vout.forEach(function (output) {
      if (!localTx && output.scriptPubKey && output.scriptPubKey.addresses) {
        output.scriptPubKey.addresses.forEach(function (address) {
          if (!localTx && ~self.addresses.indexOf(address)) {
            localTx = true
          }
        })
      }
    })
  }

  return localTx
}

Colu.prototype.registerAddress = function (address, addresses, transactions, callback) {
  var self = this
  
  if (!~addresses.indexOf(address)) {
    var channel = 'address/'+address
    self.events.on(channel, function (data) {
      var transaction = data.transaction
      if (!~transactions.indexOf(transaction.txid)) {
        transactions.push(transaction.txid)
        callback(transaction)
      }
    })
    addresses.push(address)
    self.events.join(channel)
  }
}

Colu.prototype.getIssuedAssets = function (callback) {
  var self = this
  self.getTransactions(function (err, transactions) {
    if (err) return callback(err)
    var issuances = []
    transactions.forEach(function (transaction) {
      if (transaction.colored && transaction.ccdata && transaction.ccdata.length && transaction.ccdata[0].type === 'issuance') {
        var issuance = {
          issueTxid: transaction.txid,
          txid: transaction.txid,
          lockStatus: transaction.ccdata[0].lockStatus,
          divisibility: transaction.ccdata[0].divisibility,
          amount: transaction.ccdata[0].amount,
          amountOfUnits: transaction.ccdata[0].amountOfUnits
        }
        if (!transaction.ccdata[0].payments || !transaction.ccdata[0].payments.length) {
          return
        }
        var assetId
        var indexes = []
        transaction.ccdata[0].payments.forEach(function (payment) {
          var coloredOutout = payment.output  
          if (!transaction.vout || !transaction.vout.length || !transaction.vout[coloredOutout] || !transaction.vout[coloredOutout].assets || !transaction.vout[coloredOutout].assets.length || !transaction.vout[coloredOutout].assets[0].assetId) {
            return
          }
          if (!assetId) {
            assetId = transaction.vout[coloredOutout].assets[0].assetId
          } else {
            if (assetId !== transaction.vout[coloredOutout].assets[0].assetId) {
              return err = true
            }
          }
          indexes.push(coloredOutout)
        })
        if (err || !assetId) {
          return
        }
        issuance.assetId = assetId
        issuance.outputIndexes = indexes
        if (!transaction.vin || !transaction.vin.length || !transaction.vin[0].previousOutput || !transaction.vin[0].previousOutput.addresses || !transaction.vin[0].previousOutput.addresses.length) {
          return
        }
        issuance.address = transaction.vin[0].previousOutput.addresses[0]
        issuances.push(issuance)
      }
    })
    return callback(null, issuances)
  })
}

module.exports = Colu
