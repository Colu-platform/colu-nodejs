# Colu-Node.Js
[![Build Status](https://travis-ci.org/Colu-platform/colu-nodejs.svg?branch=master)](https://travis-ci.org/Colu-platform/colu-nodejs) [![Coverage Status](https://coveralls.io/repos/Colu-platform/colu-nodejs/badge.svg?branch=master)](https://coveralls.io/r/Colu-platform/colu-nodejs?branch=master) [![npm version](https://badge.fury.io/js/colu.svg)](http://badge.fury.io/js/colu)

### Installation

```sh
$ npm i colu
```

### Constructor

```js
var Colu = require('colu')

var colu = new Colu({
    apiKey: 'mandatory if in mainnet',
    coloredCoinsHost: 'optional',
    coluHost: 'optional',
    redisPort: 'optional',
    redisHost: 'optional',
    network:: 'optional',
    privateSeed: 'optional'
})
```

### API's

```js
Colu.prototype.init(cb)
Colu.prototype.issueAsset(args, callback)
Colu.prototype.sendAsset(args, callback)
```

### Testing

```sh
$ mocha
```

### Running as a standalone server

To run as a standalone server you need to install Node.Js and NPM.
Then install the colu module globaly like this:

```sh
$ npm i -g colu
```

Then just run it from the terminal like this:

```sh
$ colu
```

And now you can use REST request to use the Colu SDK.
By default it will be hosted at : 127.0.0.1:8081 and will be locked to local host only.