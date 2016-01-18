var path = require('path-extra')
var express = require('express')
var mkpath = require('mkpath')
var Colu = require('../src/colu.js')
var jf = require('jsonfile')
var hash = require('crypto-hashing')
var morgan = require('morgan')('dev')
var methods = require('./methods')
var jsonrpc = require('node-express-json-rpc2-async')

var serverSettings = path.join(path.datadir('colu'), 'settings.json')
var settings

try {
  settings = jf.readFileSync(serverSettings)
} catch (e) {
  settings = {
    colu: {
      network: process.env.COLU_SDK_NETWORK || 'testnet',
      coluHost: process.env.COLU_SDK_COLU_HOST || 'https://dev.engine.colu.co',
      apiKey: process.env.COLU_SDK_API_KEY,
      privateSed: process.env.COLU_SDK_PRIVATE_SEED,
      privateSeedWIF: process.env.COLU_SDK_PRIVATE_SEED_WIF,
      coloredCoinsHost: process.env.COLU_SDK_CC_HOST,
      redisPort: process.env.COLU_SDK_REDIS_PORT,
      redisHost: process.env.COLU_SDK_REDIS_HOST
    },
    server: {
      port: process.env.COLU_SDK_RPC_SERVER_PORT || 8081,
      host: process.env.COLU_SDK_RPC_SERVER_HOST || '127.0.0.1'
    }
  }

  var dirname = path.dirname(serverSettings)
  mkpath.sync(dirname, settings)
  jf.writeFileSync(serverSettings, settings)
}

var colu = new Colu(settings.colu)
var app = express()

app.use(morgan)
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})
app.use(function (req, res, next) {
  if (!settings.selfApiKey) return next()
  if (hash.sha256(req.headers['x-access-token']) !== settings.selfApiKey) return res.send(401)
})
app.use(jsonrpc())

app.post('/', function (req, res, next) {
  if (!req.body) return;
  res.rpc(req.body.method, function (params, respond) {
    var methodObj = methods[req.body.method]    
    if (!methodObj) {
      return respond({error : {
        code : jsonrpc.METHOD_NOT_FOUND,
        message : 'Method not found',
        data : {missingMethod : req.body.method}
      }})      
    }

    /* prepare the parameters */

    var orderedParams
    var requiredParamNames = methods[req.body.method].params
    if (!requiredParamNames) {
      //no parameters
      orderedParams = []
    } else if (requiredParamNames.length == 1 && requiredParamNames[0] === 'params') {
      //use the params as is
      orderedParams = [params];
    } else {
      orderedParams = [];
      var paramName;
      var i;
      for (i = 0; i < requiredParamNames.length; i++) {
        paramName = requiredParamNames[i]
        if (!params[paramName]) {
          return respond({error : {
            code : jsonrpc.INVALID_PARAMS,
            message : 'Invalid params',
            data : 'required parameters: ' + requiredParamNames.toString() + ', given: ' + Object.keys(params) +'.'
          }})
        } 

        orderedParams.push(params[paramName])
      }

      var optional = methods[req.body.method].optional
      if (optional) {
        for (i = 0; i < optional.length; i++) {
          //now without throwing an error...
          paramName = optional[i]
          orderedParams.push(params[paramName])
        }
      }
    }

    /* call the method (with or without callback) */

    var methodObj = getMethodObj(req.body.method)
    if (!methods[req.body.method].callback) {
      var resultData = methodObj.method.apply(methodObj.thisObj, orderedParams) 
      return respond({result: resultData})
    } 
    //push callback to be last argument
    var callback = function (err, result) {
      if (err) return respond({
        error : {
          code : jsonrpc.INTERNAL_ERROR,
          message : 'Internal error',
          data : err
        }
      })
      respond({result : result})        
    }
    orderedParams.push(callback)
    methodObj.method.apply(methodObj.thisObj, orderedParams)
  })
})

app.use(function (req, res, next) {
  res.status(404)
  if (req.accepts('json')) return res.send({ error: 'Not found' })
  res.type('txt').send('Not found')
})

colu.on('connect', function () {
  app.listen(settings.server.port, settings.server.host, function () {
    console.log('server started on port', settings.server.port)
  })
})

colu.init()

var getMethodObj = function (methodName) {
  var res
  var methodParts = methodName.split(".") 
  var thisObj = colu
  var method = colu[methodParts[0]]
  for (var i = 1 ; i < methodParts.length ; i++) {
    thisObj = method
    method = thisObj[methodParts[i]]
  }
  return {
    method: method,
    thisObj: thisObj 
  }
}