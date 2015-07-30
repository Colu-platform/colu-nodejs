var Colu = require(__dirname + '/../colu.js')
var assert = require('assert')
var expect = require('chai').expect

describe('Test Colu SDK', function () {
  var settings = {
    network: 'testnet'
  }

  var privateSeed
  var toAddress = 'mgNcWJp4hPd7MN6ets2P8HcB5k99aCs8cy'
  var assetId
  var fromAddress
  var phoneNumber = '+1234567890'

  it('Should create and broadcast financed issue tx.', function (done) {
    this.timeout(60000)
    var colu = new Colu(settings)
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
        ]
      }
      colu.issueAsset(args, function (err, ans) {
        if (err) console.error(err)
        assert(!err)
        expect(ans.txHex).to.be.a('string')
        expect(ans.txHex).to.have.length.above(0)
        expect(ans.assetId).to.be.a('string')
        expect(ans.assetId).to.have.length.above(0)
        assetId = ans.assetId
        expect(ans.txid).to.be.a('string')
        expect(ans.txid).to.have.length.above(0)
        expect(ans.issueAddress).to.be.a('string')
        expect(ans.issueAddress).to.have.length.above(0)
        expect(ans.receivingAddresses).to.be.a('array')
        expect(ans.receivingAddresses).to.have.length.above(0)
        fromAddress = ans.receivingAddresses[0].address
        done()
      })
    })
    colu.init()
  })

  it('Should create and broadcast financed send tx.', function (done) {
    this.timeout(60000)
    settings.privateSeed = privateSeed
    var colu = new Colu(settings)
    colu.on('connect', function () {
      var address = fromAddress
      var args = {
        from: address,
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
        if (err) console.error(err)
        assert(!err)
        expect(ans.txHex).to.be.a('string')
        expect(ans.txHex).to.have.length.above(0)
        expect(ans.txid).to.be.a('string')
        expect(ans.txid).to.have.length.above(0)
        done()
      })
    })
    colu.init()
  })

  it('Should create and broadcast financed send tx.', function (done) {
    this.timeout(60000)
    settings.privateSeed = privateSeed
    var colu = new Colu(settings)
    colu.on('connect', function () {
      var address = fromAddress
      var args = {
        from: address,
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
        if (err) console.error(err)
        assert(!err)
        expect(ans.txHex).to.be.a('string')
        expect(ans.txHex).to.have.length.above(0)
        expect(ans.txid).to.be.a('string')
        expect(ans.txid).to.have.length.above(0)
        done()
      })
    })
    colu.init()
  })

})
