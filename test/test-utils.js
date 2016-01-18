var assert = require('chai').assert
var expect = require('chai').expect

var createIssueAssetArgs = function() {
  var args = {
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

var verifyIsssueAssetResponse = function (err, ans, done) {
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
}