var assert = require('chai').assert
var expect = require('chai').expect

var toAddress = 'mgNcWJp4hPd7MN6ets2P8HcB5k99aCs8cy'
var assetId
var fromAddress
var phoneNumber = '+1234567890'
var assetName = 'test_assetName'
var issuer = 'test_issuer'
var description = 'test_description'
var icon = 'https://www.colu.co/layout/img/colu.png'
var utxo

var createIssueAssetArgs = function() {
  return {
    amount: 3,
    divisibility: 0,
    reissueable: false,
    transfer: [
      {
        amount: 1
      }
    ],
    metadata: {
      assetName: assetName,
      issuer: issuer,
      description: description,
      urls: [{
        name: 'icon',
        url: icon,
        mimeType: 'image/png'
      }]
    },
  }
}

var verifyIsssueAssetResponse = function(ans) {
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
}

var createSendAssetFromUtxoArgs = function() {
  var address = fromAddress
  return {
    sendutxo: [utxo],
    to: [
      {
        address: toAddress,
        assetId: assetId,
        amount: 1
      }
    ]
  }
}

var verifySendAssetResponse = function(ans) {
  expect(ans).to.be.a('object')
  expect(ans.txHex).to.be.a('string')
  expect(ans.txHex).to.have.length.above(0)
  expect(ans.txid).to.be.a('string')
  expect(ans.txid).to.have.length.above(0)
}

var createSendAssetFromAddressArgs = function() {
    var address = fromAddress
    return {
      from: [address],
      to: [
        {
          address: toAddress,
          assetId: assetId,
          amount: 1
        }
      ]
    }
}

var createSendAssetToPhoneArgs = function() {
  var address = fromAddress
  return {
    from: [address],
    to: [
      {
        phoneNumber: phoneNumber,
        assetId: assetId,
        amount: 1
      }
    ]
  }
}

var verifyGetIssuedAssetsResponse = function(issuances) {
  expect(issuances).to.be.a('array')
  expect(issuances).to.have.length.above(0)
  assert.equal(issuances[0].assetId, assetId)
}

var createGetAssetMetadataArgs = function() {
  return {
    assetId : assetId,
    utxo : utxo
  }
}

var verifyGetAssetMetadataResponse = function(metadata) {
  expect(metadata).to.be.a('object')
  assert.equal(metadata.assetName, assetName)
  assert.equal(metadata.issuer, issuer)
  assert.equal(metadata.description, description)
  assert.equal(metadata.icon, icon)
}

module.exports = {
  createIssueAssetArgs : createIssueAssetArgs,
  verifyIsssueAssetResponse : verifyIsssueAssetResponse,
  createSendAssetFromUtxoArgs : createSendAssetFromUtxoArgs,
  verifySendAssetResponse : verifySendAssetResponse,
  createSendAssetFromAddressArgs : createSendAssetFromAddressArgs,
  createSendAssetToPhoneArgs : createSendAssetToPhoneArgs,
  verifyGetIssuedAssetsResponse : verifyGetIssuedAssetsResponse,
  createGetAssetMetadataArgs : createGetAssetMetadataArgs,
  verifyGetAssetMetadataResponse : verifyGetAssetMetadataResponse
}