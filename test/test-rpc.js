var testUtils = require('./test-utils')
var portfinder = require('portfinder')
var chai = require('chai')
var assert = require('chai').assert
var expect = require('chai').expect
var request = require('supertest');
var runningId = 1;

describe('JSON-RPC API tests', function() {

	var url = 'http://localhost'
	var address
	var assetId
	var oldEnv
	var server 

	before(function() {
		portfinder.getPort(function (err, port) {
			assert.ifError(err)
			oldEnv = {
				network: process.env.COLU_SDK_NETWORK,
				host: process.env.COLU_SDK_COLU_HOST,
				port: process.env.COLU_SDK_RPC_SERVER_HTTP_PORT,
				usessl: (process.env.COLU_SDK_RPC_USE_SSL === 'true')
			}
			process.env.COLU_SDK_NETWORK = 'testnet'
			process.env.COLU_SDK_COLU_HOST = 'https://testnet.engine.colu.co'
			process.env.COLU_SDK_RPC_SERVER_HTTP_PORT = port
			process.env.COLU_SDK_RPC_USE_SSL = false
			url = url + ':' + port
			server = require('../bin/run')
		})
	})

	after(function() {
			process.env.COLU_SDK_NETWORK = oldEnv.network
			process.env.COLU_SDK_COLU_HOST = oldEnv.host
			process.env.COLU_SDK_RPC_SERVER_HTTP_PORT = oldEnv.port
			process.env.COLU_SDK_RPC_USE_SSL = oldEnv.usessl
	})

	it('Should return an \'Invalid request\' error.', function (done) {
		this.timeout(2000)
		var body = {key: 'value'}		//Invalid JSON-RPC 2.0 body request
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.be.null
	   		expect(res.body.error).to.be.a('object')
   			expect(res.body.error.code).to.equal(-32600)
	   		done()	
		})
	})  


	it('Should return a \'Method not found\' error.', function (done) {
		this.timeout(2000)
		var body = createJsonRpcRequestObj('nonExistingMethod')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.a('object')
   			expect(res.body.error.code).to.equal(-32601)
   			expect(res.body.error.data.missingMethod).to.equal('nonExistingMethod')
	   		done()	
		})
	})  

	it('Should return an \'Invalid parameters\' error.', function (done) {
		this.timeout(2000)
		var body = createJsonRpcRequestObj('hdwallet.getAddressPath')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.a('object')
   			expect(res.body.error.code).to.equal(-32602)
	   		done()	
		})
	})  

	it('Should create and broadcast issue tx.', function (done) {
		this.timeout(10000)
		var params = testUtils.createIssueAssetArgs()
		var body = createJsonRpcRequestObj('issueAsset', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('object')
	   		testUtils.verifyIsssueAssetResponse(res.body.result)
	   		address = res.body.result.issueAddress
	   		assetId = res.body.result.assetId
	   		done()	
		})
	})

  it('Should return assets list for this wallet.', function (done) {
    this.timeout(10000)
		var body = createJsonRpcRequestObj('getAssets')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('array')
	      expect(res.body.result).to.have.length.above(0)
	      done()
   	})
  })

  it('Should create and broadcast send tx from utxo.', function (done) {
    this.timeout(10000)
    var params = testUtils.createSendAssetFromUtxoArgs()
		var body = createJsonRpcRequestObj('sendAsset', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			testUtils.verifySendAssetResponse(res.body.result)
	      done()
   	})
  })

  it('Should create and broadcast send tx from address.', function (done) {
    this.timeout(10000)
    var params = testUtils.createSendAssetFromAddressArgs()
		var body = createJsonRpcRequestObj('sendAsset', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			testUtils.verifySendAssetResponse(res.body.result)
	      done()
   	})
  })

  it('Should create and broadcast send tx to phone.', function (done) {
    this.timeout(10000)
    var params = testUtils.createSendAssetToPhoneArgs()
		var body = createJsonRpcRequestObj('sendAsset', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			testUtils.verifySendAssetResponse(res.body.result)
	      done()
   	})
  })

  it('Should return transactions list for this wallet.', function (done) {
    this.timeout(10000)
		var body = createJsonRpcRequestObj('getTransactions')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
	      assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
	      expect(res.body.result).to.be.a('array')
	      expect(res.body.result).to.have.length.above(0)
	      done()
    })
  })

  it('Should return issuances list for this wallet.', function (done) {
    this.timeout(15000)
		var body = createJsonRpcRequestObj('getIssuedAssets')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
      	assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
	      testUtils.verifyGetIssuedAssetsResponse(res.body.result)
     	 	done()
    })
  })

  it('Should return asset metadata.', function (done) {
    this.timeout(10000)
    var params = testUtils.createGetAssetMetadataArgs()
		var body = createJsonRpcRequestObj('getAssetMetadata', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
	      assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
	      testUtils.verifyGetAssetMetadataResponse(res.body.result)
	      done()
    })
  })

  it('Should get stakeholders.', function (done) {
    this.timeout(60000)
    var params = {assetId : assetId, numConfirmations: 0}
		var body = createJsonRpcRequestObj('coloredCoins.getStakeHolders', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
	   	.end(function (err, res) {
 	      assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
	   		expect(res.body.result.assetId).to.equal(assetId)
	   		expect(res.body.result.holders).to.be.a('array')
	      expect(res.body.result.holders).to.have.length.above(0)
	      done()
    })
  })

	it('Should return private seed.', function (done) {
		this.timeout(1000)
		var body = createJsonRpcRequestObj('hdwallet.getPrivateSeed')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('string')
				expect(res.body.result).to.have.length.above(0)
	   		done()	
		})
	})

	it('Should return address path.', function (done) {
		this.timeout(2000)
		var params = {address : address}
		var body = createJsonRpcRequestObj('hdwallet.getAddressPath', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('string')
				expect(res.body.result).to.have.length.above(0)
	   		done()	
		})
	})  

	it('Should return a new valid address.', function (done) {
		this.timeout(2000)
		var body = createJsonRpcRequestObj('hdwallet.getAddress')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('string')
				expect(res.body.result).to.have.length.above(0)
	   		done()	
		})
	})

	it('Should return a valid private key.', function (done) {
		this.timeout(2000)
		var body = createJsonRpcRequestObj('hdwallet.getPrivateKey')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('string')
				expect(res.body.result).to.have.length.above(0)
	   		done()	
		})
	})

	it('Should return a valid private key from address.', function (done) {
		this.timeout(2000)
		var params = {address : address}
		var body = createJsonRpcRequestObj('hdwallet.getAddressPrivateKey', params)
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('string')
				expect(res.body.result).to.have.length.above(0)
	   		done()	
		})
	})

	it('Should return a valid public key.', function (done) {
		this.timeout(2000)
		var body = createJsonRpcRequestObj('hdwallet.getPublicKey')
		var contentLength = calculateObjectBytesLength(body)
		request(url)
	   	.post('/')
	   	.send(body)
	   	.set('Accept', 'application/json')
	   	.set('Content-Type', 'application/json')
	   	.set('Content-Length', contentLength)
	   	.expect(200)
			.end(function (err, res) {
				assert.ifError(err)
	   		expect(res.body.jsonrpc).to.equal('2.0')
	   		expect(res.body.id).to.equal(body.id)
	   		expect(res.body.error).to.be.undefined
   			expect(res.body.result).to.be.a('string')
				expect(res.body.result).to.have.length.above(0)
	   		done()	
		})
	})

})

var createJsonRpcRequestObj = function (methodName, params) {
	return {
		jsonrpc : '2.0',
		method: methodName,
		params: params,
		id: runningId++
	}
}

var calculateObjectBytesLength = function (obj) {
	return Buffer.byteLength(JSON.stringify(obj))
}