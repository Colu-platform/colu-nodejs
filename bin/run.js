#!/usr/bin/env node
var path = require('path-extra')
var express = require('express')
var mkpath = require('mkpath')
var Colu = require(__dirname + '/../colu.js')
var bodyParser = require('body-parser')
var jf = require('jsonfile')

var serverSettings = path.join(path.datadir('colu'), 'settings.json')
var settings

try {
  settings = jf.readFileSync(__dirname + '/' + serverSettings)
} catch (e) {
  settings = {
    colu: {
      network: 'testnet',
      privateSeed: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
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
  res.status(404)
  if (req.accepts('json')) return res.send({ error: 'Not found' })
  res.type('txt').send('Not found')
})

app.post('/signAndTransmit', function (req, res, next) {
  var txHex = req.body.txHex
  var last_txid = req.body.last_txid
  var host = req.body.host
  colu.signAndTransmit(txHex, last_txid, host, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/sendAsset', function (req, res, next) {
  var settings = req.body.settings
  colu.sendAsset(settings, function (err, result) {
    if (err) return next(err)
    res.send(result)
  })
})

app.post('/issueAsset', function (req, res, next) {
  var settings = req.body.settings
  colu.issueAsset(settings, function (err, result) {
    if (err) return err
    res.send(result)
  })
})

colu.on('connect', function () {
  app.listen(settings.server.port, settings.server.host, function () {
    console.log('server started')
  })
})

colu.init()
