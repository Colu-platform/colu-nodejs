#!/usr/bin/env node
var path = require('path-extra')
var express = require('express')
var mkpath = require('mkpath')
var Colu = require(__dirname + '/../colu.js')
var bodyParser = require('body-parser')
var jf = require('jsonfile')
var hash = require('crypto-hashing')

var serverSettings = path.join(path.datadir('colu'), 'settings.json')
var settings

try {
  settings = jf.readFileSync(__dirname + '/' + serverSettings)
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

app.post('/signandtransmit', function (req, res, next) {
  var txHex = req.body.txHex
  var last_txid = req.body.last_txid
  var host = req.body.host
  colu.signAndTransmit(txHex, last_txid, host, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/sendasset', function (req, res, next) {
  var settings = req.body.settings
  colu.sendAsset(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/issueasset', function (req, res, next) {
  var settings = req.body.settings
  colu.issueAsset(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

// Colored Coins End Points ///////
app.post('/coloredcoins/getissueassettx', function (req, res, next) {
  var settings = req.body.settings
  colu.coloredCoins.getSendAssetTx(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/coloredcoins/getsendassettx', function (req, res, next) {
  var settings = req.body.settings
  colu.issueAsset(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/coloredcoins/broadcasttx', function (req, res, next) {
  var settings = req.body.settings
  colu.coloredCoins.broadcastTx(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.get('/coloredcoins/getaddressinfo', function (req, res, next) {
  var address = req.query.address
  colu.coloredCoins.getAddressInfo(address, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.get('/coloredcoins/getstakeholders', function (req, res, next) {
  var assetId = req.query.assetId
  var numConfirmations = req.query.settings || 0
  colu.coloredCoins.getStakeHolders(assetId, numConfirmations, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.get('/coloredcoins/getassetmetadata', function (req, res, next) {
  var assetId = req.query.assetId
  var utxo = req.query.utxo
  colu.coloredCoins.getAssetMetadata(assetId, utxo, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/coloredcoins/getassetdata', function (req, res, next) {
  var settings = req.body.settings
  colu.coloredCoins.getAssetData(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.get('/coloredcoins/signtx', function (req, res, next) {
  var unsignedTx = req.query.unsignedTx
  var privateKey = req.query.privateKey
  return res.send(colu.coloredCoins.signTx(unsignedTx, privateKey))
})

app.get('/coloredcoins/getinputaddresses', function (req, res, next) {
  var txHex = req.query.txHex
  var network = req.query.network
  return res.send(colu.coloredCoins.getInputAddresses(txHex, network))
})

app.get('/hdwallet/getaddress', function (req, res, next) {
  var account = req.query.account
  var addressIndex = req.query.addressIndex
  return res.send(colu.hdwallet.getAddress(account, addressIndex))
})

// //////////
app.use(function (req, res, next) {
  res.status(404)
  if (req.accepts('json')) return res.send({ error: 'Not found' })
  res.type('txt').send('Not found')
})

colu.on('connect', function () {
  app.listen(settings.server.port, settings.server.host, function () {
    console.log('server started')
  })
})

colu.init()
