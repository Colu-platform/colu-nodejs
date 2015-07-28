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
    apiKey: 'mandatory',
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
