#!/usr/bin/env node
var path = require('path-extra')
var express = require('express')
var mkpath = require('mkpath')
var Colu = require(__dirname + '/../colu.js')
var bodyParser = require('body-parser')
var jf = require('jsonfile')
var hash = require('crypto-hashing')
var morgan = require('morgan')('dev')

var serverSettings = path.join(path.datadir('colu'), 'settings.json')
var settings

try {
  settings = jf.readFileSync(serverSettings)
} catch (e) {
  settings = {
    colu: {
      network: 'testnet'
    },
    server: {
      port: 8081,
      host: '127.0.0.1'
    }
  }
  var dirname = path.dirname(serverSettings)
  mkpath.sync(dirname, settings)
  jf.writeFileSync(serverSettings, settings)
}

var colu = new Colu(settings.colu)
var app = express()

app.use(morgan)
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(function (req, res, next) {
  if (!settings.selfApiKey) return next()
  if (hash.sha256(req.headers['x-access-token']) !== settings.selfApiKey) return res.send(401)
})

// ////////// Colu Wrappers ////////////
app.post('/sendasset', function (req, res, next) {
  colu.sendAsset(req.body, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/issueasset', function (req, res, next) {
  colu.issueAsset(req.body, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})
// /////////////////////////////////////////////////

// Colored Coins End Points ///////
app.post('/coloredcoins/issue', function (req, res, next) {
  colu.coloredCoins.getSendAssetTx(req.body, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/coloredcoins/sendasset', function (req, res, next) {
  var settings = req.body.settings
  colu.issueAsset(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.get('/coloredcoins/addressinfo/:address', function (req, res, next) {
  colu.coloredCoins.getAddressInfo(req.params.address, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.get('/coloredcoins/stakeholders/:assetId/:numConfirmations', function (req, res, next) {
  colu.coloredCoins.getStakeHolders(req.params.assetId, req.params.numConfirmations || 0, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.get('/coloredcoins/assetmetadata/:assetId/:utxo', function (req, res, next) {
  colu.coloredCoins.getAssetMetadata(req.params.assetId, req.params.utxo, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/coloredcoins/assetdata/:assetid/:numconfirmations', function (req, res, next) {
  var settings = {
    assetId: req.params.assetid,
    numConfirmations: req.params.numconfirmations,
    addresses: req.body.addresses
  }
  colu.coloredCoins.getAssetData(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/coloredcoins/signtx/:unsignedtx/:privatekey', function (req, res, next) {
  return res.send(colu.coloredCoins.signTx(req.params.unsignedtx, req.params.privatekey))
})

app.get('/coloredcoins/inputaddresses/:txhex/:network', function (req, res, next) {
  return res.send(colu.coloredCoins.getInputAddresses(req.params.txhex, req.params.network))
})

// /////////////////////////////////////////////////

// ////////// Utility Functions wrapper ////////////
app.post('/broadcast', function (req, res, next) {
  colu.coloredCoins.broadcastTx(req.body, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/signandbroadcast/:txHex/:last_txid/:host', function (req, res, next) {
  colu.signAndTransmit(req.params.txHex, req.params.last_txid, req.params.host, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})
// /////////////////////////////////////////////////

app.get('/hdwallet/address', function (req, res, next) {
  return res.send(colu.hdwallet.getAddress())
})

app.get('/hdwallet/address/:account/:addressindex', function (req, res, next) {
  return res.send(colu.hdwallet.getAddress(req.params.account, req.params.addressindex))
})

// //////////
app.use(function (req, res, next) {
  res.status(404)
  if (req.accepts('json')) return res.send({ error: 'Not found' })
  res.type('txt').send('Not found')
})

colu.on('connect', function () {
  app.listen(settings.server.port, settings.server.host, function () {
    console.log('server started on port', settings.server.port)
  })
})

colu.init()
