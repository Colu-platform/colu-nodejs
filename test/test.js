var Colu = require('../src/colu')
var testUtils = require('./test-utils')
var assert = require('chai').assert
var expect = require('chai').expect

describe('Test Colu SDK', function () {

  var toAddress = 'mgNcWJp4hPd7MN6ets2P8HcB5k99aCs8cy'
  var assetId
  var fromAddress
  var phoneNumber = '+1234567890'
  var assetName = 'test_assetName'
  var issuer = 'test_issuer'
  var description = 'test_description'
  var icon = 'https://www.colu.co/layout/img/colu.png'
  var utxo

  var settings
  try {
    settings = require('./settings')
  }
  catch (e) {
    settings = {
      network: 'testnet',
      events: true,
      eventsSecure: true,
    }
  }
  var colu

  it('Should create and broadcast issue tx.', function (done) {
    this.timeout(100000)
    colu = new Colu(settings)
    colu.on('connect', function () {
      var args = testUtils.createIssueAssetArgs();
      colu.issueAsset(args, function (err, ans) {
        assert.ifError(err)
        testUtils.verifyIsssueAssetResponse(ans)
        done()
      })
    })
    colu.init()
  })

  it('Should return assets list for this wallet.', function (done) {
    this.timeout(10000)
    colu.getAssets(function (err, assets) {
      assert.ifError(err)
      expect(assets).to.be.a('array')
      expect(assets).to.have.length.above(0)
      done()
    })
  })

  it('Should create and broadcast send tx from utxo.', function (done) {
    this.timeout(100000)
    var args = testUtils.createSendAssetFromUtxoArgs()
    colu.sendAsset(args, function (err, ans) {
      assert.ifError(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should create and broadcast send tx from address.', function (done) {
    this.timeout(100000)
    var args = testUtils.createSendAssetFromAddressArgs();
    colu.sendAsset(args, function (err, ans) {
      assert.ifError(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should create and broadcast send tx to phone.', function (done) {
    this.timeout(100000)
    var args = testUtils.createSendAssetToPhoneArgs();
    colu.sendAsset(args, function (err, ans) {
      assert.ifError(err)
      testUtils.verifySendAssetResponse(ans)
      done()
    })
  })

  it('Should return transactions list for this wallet.', function (done) {
    this.timeout(5000)
    colu.getTransactions(function (err, transactions) {
      assert.ifError(err)
      expect(transactions).to.be.a('array')
      expect(transactions).to.have.length.above(0)
      done()
    })
  })

  it('Should return issuances list for this wallet.', function (done) {
    this.timeout(5000)
    colu.getIssuedAssets(function (err, issuances) {
      assert.ifError(err)
      testUtils.verifyGetIssuedAssetsResponse(issuances)
      done()
    })
  })

  it('Should return asset metadata.', function (done) {
    this.timeout(10000)
    var args = testUtils.createGetAssetMetadataArgs()
    colu.getAssetMetadata(args.assetId, args.utxo, true, function (err, metadata) {
      assert.ifError(err)
      testUtils.verifyGetAssetMetadataResponse(metadata)
      done()
    })
  })

  it('Should return cached asset metadata.', function (done) {
    // this time with shorter default timeout
    var args = testUtils.createGetAssetMetadataArgs()
    colu.getAssetMetadata(args.assetId, args.utxo, false, function (err, metadata) {
      assert.ifError(err)
      testUtils.verifyGetAssetMetadataResponse(metadata)
      done()
    })
  })

})
