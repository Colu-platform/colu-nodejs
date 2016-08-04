/* eslint-env mocha */
var Colu = require('..')
var testUtils = require('./test-utils')
var expect = require('chai').expect

describe('Test Colu SDK', function () {

  var settings
  var colu

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
    this.timeout(100000)
    var args = testUtils.createIssueAssetArgs();
    colu.issueAsset(args, function (err, ans) {
      if (err) return done(err)
      // console.log('ans', ans)
      testUtils.verifyIsssueAssetResponse(ans)
      done()
    })
  })

  it('Should return assets list for this wallet.', function (done) {
    this.timeout(20000)
    // setTimeout(function () {
      colu.getAssets(function (err, assets) {
        if (err) return done(err)
        expect(assets).to.be.a('array')
        expect(assets).to.have.length.above(0)
        done()
      })
    // }, 10000)
  })

  it('Should create and broadcast send tx from utxo.', function (done) {
    this.timeout(100000)
    var args = testUtils.createSendAssetFromUtxoArgs()
    colu.sendAsset(args, function (err, ans) {
      if (err) return done(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should create and broadcast send tx from address.', function (done) {
    this.timeout(100000)
    var args = testUtils.createSendAssetFromAddressArgs();
    colu.sendAsset(args, function (err, ans) {
      if (err) return done(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should create and broadcast send tx to phone.', function (done) {
    this.timeout(100000)
    var args = testUtils.createSendAssetToPhoneArgs();
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

})
