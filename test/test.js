var Colu = require('..')
var assert = require('chai').assert
var expect = require('chai').expect

describe('Test Colu SDK', function () {

  var privateSeed
  var toAddress = 'mgNcWJp4hPd7MN6ets2P8HcB5k99aCs8cy'
  var assetId
  var fromAddress
  var phoneNumber = '+1234567890'
  var assetName = 'test_assetName'
  var issuer = 'test_issuer'
  var description = 'test_description'
  var utxo

  var settings = {
    apiKey: apiKey,
    network: 'testnet',
    coluHost: 'https://dev.engine.colu.co'
  }

  var colu

  it('Should create and broadcast issue tx.', function (done) {
    this.timeout(30000)
    colu = new Colu(settings)
    colu.on('connect', function () {
      privateSeed = colu.hdwallet.getPrivateSeed()
      var args = {
        amount: 2,
        divisibility: 0,
        fee: 1000,
        reissueable: false,
        transfer: [
          {
            amount: 1
          }
        ],
        metadata: {
          assetName: assetName,
          issuer: issuer,
          description:description
        }
      }
      colu.issueAsset(args, function (err, ans) {
        assert.ifError(err)
        expect(ans.txHex).to.be.a('string')
        expect(ans.txHex).to.have.length.above(0)
        expect(ans.assetId).to.be.a('string')
        expect(ans.assetId).to.have.length.above(0)
        assetId = ans.assetId
        expect(ans.txid).to.be.a('string')
        expect(ans.txid).to.have.length.above(0)
        var issueTxid = ans.txid
        expect(ans.issueAddress).to.be.a('string')
        expect(ans.issueAddress).to.have.length.above(0)
        expect(ans.receivingAddresses).to.be.a('array')
        expect(ans.receivingAddresses).to.have.length.above(0)
        expect(ans.coloredOutputIndexes).to.be.a('array')
        expect(ans.coloredOutputIndexes).to.have.length.above(0)
        utxo = issueTxid + ':' + ans.coloredOutputIndexes[0]
        fromAddress = ans.receivingAddresses[0].address
        done()
      })
    })
    colu.init()
  })

  it('Should return assets list for this wallet.', function (done) {
    this.timeout(5000)
    colu.getAssets(function (err, assets) {
      assert.ifError(err)
      expect(assets).to.be.a('array')
      expect(assets).to.have.length.above(0)
      done()
    })
  })

  it('Should create and broadcast send tx.', function (done) {
    this.timeout(30000)
    var address = fromAddress
    var args = {
      from: [address],
      fee: 1000,
      to: [
        {
          address: toAddress,
          assetId: assetId,
          amount: 1
        }
      ]
    }
    colu.sendAsset(args, function (err, ans) {
      assert.ifError(err)
      expect(ans.txHex).to.be.a('string')
      expect(ans.txHex).to.have.length.above(0)
      expect(ans.txid).to.be.a('string')
      expect(ans.txid).to.have.length.above(0)
      done()
    })
  })

  it('Should create and broadcast send tx to phone.', function (done) {
    this.timeout(30000)
    var address = fromAddress
    var args = {
      from: [address],
      fee: 1000,
      to: [
        {
          phoneNumber: phoneNumber,
          assetId: assetId,
          amount: 1
        }
      ]
    }
    colu.sendAsset(args, function (err, ans) {
      assert.ifError(err)
      expect(ans.txHex).to.be.a('string')
      expect(ans.txHex).to.have.length.above(0)
      expect(ans.txid).to.be.a('string')
      expect(ans.txid).to.have.length.above(0)
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

  it('Should return asset metadata.', function (done) {
    this.timeout(5000)
    colu.getAssetMetadata(assetId, utxo, true, function (err, metadata) {
      assert.ifError(err)
      expect(metadata).to.be.a('object')
      expect(metadata.metadataOfIssuence).to.be.a('object')
      expect(metadata.metadataOfIssuence.data).to.be.a('object')
      var data = metadata.metadataOfIssuence.data
      assert.equal(data.assetName, assetName)
      assert.equal(data.issuer, issuer)
      assert.equal(data.description, description)
      done()
    })
  })

  it('Should return cached asset metadata.', function (done) {
    colu.getAssetMetadata(assetId, utxo, false, function (err, metadata) {
      assert.ifError(err)
      expect(metadata).to.be.a('object')
      assert.equal(metadata.assetName, assetName)
      assert.equal(metadata.issuer, issuer)
      assert.equal(metadata.description, description)
      done()
    })
  })

})
