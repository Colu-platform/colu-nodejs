module.exports = {
	"issueAsset" : {
		'params': ['params'],
		'callback': true
	},
	"sendAsset" : {
		'params': ['params'],
		'callback': true
	},
	"getAssets" : {
		'callback': true
	},
	"getTransactions": {
		'optional': ['addresses'],
		'callback': true	
	},
	"getIssuedAssets": {
		'optional': ['transactions'],
		'callback': true
	},
	"getAssetMetadata": {
		'params': ['assetId', 'utxo'],
		'optional': ['full'],
		'callback': true
	},

	/* Colored Coins */

	"coloredCoins.getIssueAssetTx": {
		'params': ['params'],
		'callback': true
	},
	"coloredCoins.getSendAssetTx": {
		'params': ['params'],
		'callback': true
	},
	"coloredCoins.getAddressInfo": {
		'params': ['address'],
		'callback': true
	},
	"coloredCoins.getStakeHolders": {
		'params': ['assetId'],
		'optional': ['numConfirmations'],
		'callback': true
	},
	"coloredCoins.getAssetData": {
		'params': ['params'],
		'callback': true
	},
	"coloredCoins.verifyIssuer": {
		'params': ['assetId', 'json'],
		'callback': true
	},
	"coloredCoins.broadcastTx": {
		'params': ['params'],
		'callback': true
	},

	/* HD Wallet */
	
	"hdwallet.getAddresses": {
		'callback': true	
	},
	"hdwallet.getAddressPrivateKey": {
		'params': ['address'],
		'callback': true
	},
	"hdwallet.getAddressPath": {
		'params': ['address'],
		'callback': true
	},
	"hdwallet.getPrivateSeed": {
	},
	"hdwallet.getPrivateKey": {
		'optional': ['account', 'addressIndex']
	},
	"hdwallet.getPublicKey": {
		'optional': ['account', 'addressIndex']
	},
	"hdwallet.getAddress": {
		'optional': ['account', 'addressIndex']		
	}
}