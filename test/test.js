/* eslint-env mocha */
var Colu = require('..')
var testUtils = require('./test-utils')
var expect = require('chai').expect
var async = require('async')
var _ = require('lodash')

describe('Test Colu SDK', function () {

  var settings
  var colu
  var assetId

  before(function (done) {
    try {
      settings = require('./settings')
    } catch (e) {
      settings = {
        network: 'testnet',
        events: true,
        eventsSecure: true
      }
    }
    colu = new Colu(settings)
    colu.on('connect', done)
    colu.init()
  })

  it('Should get an empty list of assets', function (done) {
    this.timeout(5000)
    colu.getAssets(function (err, assets) {
      if (err) return done(err)
      expect(assets).to.be.a('array')
      expect(assets).to.have.lengthOf(0)
      done()
    })
  })

  it('Should get an empty list of transactions', function (done) {
    this.timeout(5000)
    colu.getTransactions(function (err, transactions) {
      if (err) return done(err)
      expect(transactions).to.be.a('array')
      expect(transactions).to.have.lengthOf(0)
      done()
    })
  })

  it('Should create and broadcast issue tx.', function (done) {
    this.timeout(20000)
    var args = testUtils.createIssueAssetArgs()
    colu.issueAsset(args, function (err, ans) {
      if (err) return done(err)
      assetId = ans.assetId
      testUtils.verifyIssueAssetResponse(ans)
      done()
    })
  })

  it('Should return assets list for this wallet.', function (done) {
    this.timeout(20000)
    colu.getAssets(function (err, assets) {
      if (err) return done(err)
      expect(assets).to.be.a('array')
      expect(assets).to.have.length.above(0)
      done()
    })
  })

  it('Should burn amount of assets from utxo.', function (done) {
    this.timeout(100000)
    var args = testUtils.createBurnAssetFromUtxoArgs()
    var totalSupply
    async.waterfall([
      function (cb) {
        colu.getAssetMetadata(assetId, null, cb)
      },
      function (data, cb) {
        totalSupply = data.totalSupply
        colu.burnAsset(args, cb)
      },
      function (data, cb) {
        testUtils.verifyBurnAssetResponse(data)
        colu.getAssetMetadata(assetId, null, cb)
      }
    ],
    function (err, data) {
      if (err) return done(err)
      expect(data.totalSupply).to.equal(totalSupply - _.sumBy(args.burn, 'amount'))
      done()
    })
  })

  it('Should burn amount of assets from address.', function (done) {
    this.timeout(20000)
    var args = testUtils.createBurnAssetFromAddressArgs()
    var totalSupply
    async.waterfall([
      function (cb) {
        colu.getAssetMetadata(assetId, null, cb)
      },
      function (data, cb) {
        totalSupply = data.totalSupply
        colu.burnAsset(args, cb)
      },
      function (data, cb) {
        testUtils.verifyBurnAssetResponse(data)
        colu.getAssetMetadata(assetId, null, cb)
      }
    ],
    function (err, data) {
      if (err) return done(err)
      expect(data.totalSupply).to.equal(totalSupply - _.sumBy(args.burn, 'amount'))
      done()
    })
  })

  it('Should create and broadcast send tx from utxo.', function (done) {
    this.timeout(20000)
    var args = testUtils.createSendAssetFromUtxoArgs()
    colu.sendAsset(args, function (err, ans) {
      if (err) return done(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should create and broadcast send tx from address.', function (done) {
    this.timeout(20000)
    var args = testUtils.createSendAssetFromAddressArgs()
    colu.sendAsset(args, function (err, ans) {
      if (err) return done(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should create and broadcast send tx to phone.', function (done) {
    this.timeout(20000)
    var args = testUtils.createSendAssetToPhoneArgs()
    colu.sendAsset(args, function (err, ans) {
      if (err) return done(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should return transactions list for this wallet.', function (done) {
    this.timeout(5000)
    colu.getTransactions(function (err, transactions) {
      if (err) return done(err)
      expect(transactions).to.be.a('array')
      expect(transactions).to.have.length.above(0)
      done()
    })
  })

  it('Should return issuances list for this wallet.', function (done) {
    this.timeout(5000)
    colu.getIssuedAssets(function (err, issuances) {
      if (err) return done(err)
      testUtils.verifyGetIssuedAssetsResponse(issuances)
      done()
    })
  })

  it('Should return asset metadata.', function (done) {
    this.timeout(10000)
    var args = testUtils.createGetAssetMetadataArgs()
    colu.getAssetMetadata(args.assetId, args.utxo, true, function (err, metadata) {
      if (err) return done(err)
      testUtils.verifyGetAssetMetadataResponse(metadata)
      done()
    })
  })

  it('Should return cached asset metadata.', function (done) {
    // this time with shorter default timeout
    var args = testUtils.createGetAssetMetadataArgs()
    colu.getAssetMetadata(args.assetId, args.utxo, false, function (err, metadata) {
      if (err) return done(err)
      testUtils.verifyGetAssetMetadataResponse(metadata)
      done()
    })
  })

  it('Should return new transaction secure.', function (done) {
    this.timeout(100000)
    colu.eventsSecure = true

    var txids = []
    var txid
    var once = 0
    colu.on('newTransaction', function (transaction) {
      txids.push(transaction.txid)
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
    var args = testUtils.createIssueAssetArgs()
    colu.issueAsset(args, function (err, ans) {
      if (err) return done(err)
      txid = ans.txid
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
  })

  it('Should return new transaction unsecure.', function (done) {
    this.timeout(100000)
    colu.eventsSecure = false

    var txids = []
    var txid
    var once = 0
    colu.on('newTransaction', function (transaction) {
      txids.push(transaction.txid)
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
    var args = testUtils.createIssueAssetArgs()
    colu.issueAsset(args, function (err, ans) {
      if (err) return done(err)
      txid = ans.txid
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
  })

  it('Should return new cc transaction secure.', function (done) {
    this.timeout(100000)

    colu.eventsSecure = true
    var txids = []
    var txid
    var once = 0
    colu.on('newCCTransaction', function (transaction) {
      txids.push(transaction.txid)
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
    var args = testUtils.createIssueAssetArgs()
    colu.issueAsset(args, function (err, ans) {
      if (err) return done(err)
      txid = ans.txid
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
  })

  it('Should return new cc transaction unsecure.', function (done) {
    this.timeout(100000)
    colu.eventsSecure = false

    var txids = []
    var txid
    var once = 0
    colu.on('newCCTransaction', function (transaction) {
      txids.push(transaction.txid)
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
    var args = testUtils.createIssueAssetArgs()
    colu.issueAsset(args, function (err, ans) {
      if (err) return done(err)
      txid = ans.txid
      if (txid && ~txids.indexOf(txid) && !once++) return done()
    })
  })
})
