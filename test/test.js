var Colu = require(__dirname + '/../src/colu.js')
var assert = require('assert')
var expect = require('chai').expect

var testnetApi = 'https://dev.api.coloredcoins.org'
var coluHost = 'https://dev.engine.colu.co'

describe('Test Colu SDK', function () {
	var settings = {
		coloredCoinsHost: testnetApi,
		coluHost: coluHost,
		network: 'testnet'
	}

	var privateSeed
	var toAddress = 'mgNcWJp4hPd7MN6ets2P8HcB5k99aCs8cy'
	var assetId

	it('Should create and send financed issue tx.', function (done) {
		this.timeout(30000)
		var colu = new Colu(settings)
		colu.on('connect', function () {
			privateSeed = colu.hdwallet.getPrivateSeed()
			var args = {
		    amount: 1,
		    divisibility: 0,
		    fee: 1000,
		    reissueable: false,
		    transfer: [
		      {
		        amount: 1
		      }
		    ],
		  }
			colu.financedIssue(args, function (err, ans) {
				if (err) console.error(err)
				assert(!err)
				expect(ans.txHex).to.be.a('string')
	      expect(ans.txHex).to.have.length.above(0)
				expect(ans.assetId).to.be.a('string')
	      expect(ans.assetId).to.have.length.above(0)
	      assetId = ans.assetId
	      expect(ans.txid).to.be.a('string')
	      expect(ans.txid).to.have.length.above(0)
				done()
			})
		})
		colu.init()
	})

	it('Should create and send financed send tx.', function (done) {
		this.timeout(30000)
		settings.privateSeed = privateSeed
		var colu = new Colu(settings)
		colu.on('connect', function () {
			var address = colu.hdwallet.getPublicKey(0).getAddress(colu.hdwallet.network).toString()
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
			colu.financedSend(args, function (err, ans) {
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
