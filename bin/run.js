#!/usr/bin/env node
var path = require('path-extra')
var express = require('express')
var auth = require('basic-auth')
// var mkpath = require('mkpath')
var Colu = require('../src/colu')
// var jf = require('jsonfile')
// var hash = require('crypto-hashing')
var morgan = require('morgan')('dev')
var methods = require('./methods')
var jsonrpc = require('node-express-json-rpc2-async')
var fs = require('fs')
var http = require('http')
var https = require('https')

var settings
var privateKey
var certificate
var sslCredentials
var serverSettingsPath = path.join(path.datadir('colu'), 'settings')

try {
  settings = require(serverSettingsPath)
} catch (e) {}

settings = settings || {}
settings.colu = settings.colu || {}
settings.colu.network = settings.colu.network || process.env.COLU_SDK_NETWORK // Optional: Possible values are testnet and mainnet. Default value is mainnet
settings.colu.coluHost = settings.colu.coluHost || process.env.COLU_SDK_COLU_HOST // Optional
settings.colu.apiKey = settings.colu.apiKey || process.env.COLU_SDK_API_KEY // Mandatory in case COLU_SDK_NETWORK is mainnet
settings.colu.privateSeed = settings.colu.privateSeed || process.env.COLU_SDK_PRIVATE_SEED // Optional (otherwise generate new one every server start)
settings.colu.privateSeedWIF = settings.colu.privateSeedWIF || process.env.COLU_SDK_PRIVATE_SEED_WIF // Optional (otherwise generate new one every server start)
// Note: only one of COLU_SDK_PRIVATE_SEED and COLU_SDK_PRIVATE_SEED_WIF should be filled
settings.colu.redisPort = settings.colu.redisPort || process.env.COLU_SDK_REDIS_PORT // Optional
settings.colu.redisHost = settings.colu.redisHost || process.env.COLU_SDK_REDIS_HOST // Optional

settings.server = settings.server || {}

settings.server.httpPort = settings.server.httpPort || process.env.COLU_SDK_RPC_SERVER_HTTP_PORT || process.env.PORT || 80 // Optional
settings.server.httpsPort = settings.server.httpsPort || process.env.COLU_SDK_RPC_SERVER_HTTPS_PORT || 443 // Optional
settings.server.host = settings.server.host || process.env.COLU_SDK_RPC_SERVER_HOST || '127.0.0.1' // Optional

settings.server.usessl = settings.server.usessl || (process.env.COLU_SDK_RPC_USE_SSL === 'true') // Optional
settings.server.useBoth = settings.server.useBoth || (process.env.COLU_SDK_RPC_USE_BOTH === 'true') // both HTTP and HTTPS - Optional
settings.server.privateKeyPath = settings.server.privateKeyPath || process.env.COLU_SDK_RPC_PRIVATE_KEY_PATH // Mandatory in case COLU_SDK_RPC_USE_SSL or COLU_SDK_RPC_USE_BOTH is true
settings.server.certificatePath = settings.server.certificatePath || process.env.COLU_SDK_RPC_CERTIFICATE_PATH // Mandatory in case COLU_SDK_RPC_USE_SSL or COLU_SDK_RPC_USE_BOTH is true

settings.server.useBasicAuth = settings.server.useBasicAuth || (process.env.COLU_SDK_RPC_USE_BASIC_AUTH === 'true') // Optional
settings.server.userName = settings.server.userName || process.env.COLU_SDK_RPC_USER_NAME // Manadatory in case COLU_SDK_RPC_USE_BASIC_AUTH is true
settings.server.password = settings.server.password || process.env.COLU_SDK_RPC_PASSWORD // Manadatory in case COLU_SDK_RPC_USE_BASIC_AUTH is true

if (settings.server.usessl && settings.server.privateKeyPath && settings.server.certificatePath) {
  try {
    privateKey = fs.readFileSync(settings.server.privateKeyPath, 'utf8')
    certificate = fs.readFileSync(settings.server.certificatePath, 'utf8')
    sslCredentials = {key: privateKey, cert: certificate}
  } catch (e) {}
}

var colu = new Colu(settings.colu)
var app = express()

app.use(morgan)

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

if (settings.server.useBasicAuth && settings.server.userName && settings.server.password) {
  app.use(function (req, res, next) {
    var basicAuthCredentials = auth(req)
    if (!basicAuthCredentials || basicAuthCredentials.name !== settings.server.userName || basicAuthCredentials.pass !== settings.server.password) {
      res.statusCode = 401
      res.setHeader('WWW-Authenticate', 'Basic realm=""')
      res.end('Access denied')
    } else {
      next()
    }
  })
}

app.use(jsonrpc())

app.options('/', function (req, res, next) {
    res.status(200).end();
});

app.post('/', function (req, res, next) {
  if (!req.body) return

  res.rpc(req.body.method, function (params, respond) {
    var methodObj = methods[req.body.method]
    if (!methodObj) {
      return respond({error: {
        code: jsonrpc.METHOD_NOT_FOUND,
        message: 'Method not found',
        data: {missingMethod: req.body.method}
      }})
    }

    /* prepare the parameters */
    var orderedParams
    var requiredParamNames = methods[req.body.method].params
    if (!requiredParamNames) {
      // no parameters
      orderedParams = []
    } else if (requiredParamNames.length === 1 && requiredParamNames[0] === 'params') {
      // use the params as is
      orderedParams = [params]
    } else {
      orderedParams = []
      var paramName
      var i
      for (i = 0; i < requiredParamNames.length; i++) {
        paramName = requiredParamNames[i]
        if (!params || !params[paramName]) {
          return respond({error: {
            code: jsonrpc.INVALID_PARAMS,
            message: 'Invalid params',
            data: 'required parameters: ' + requiredParamNames.toString() + ', given: ' + (!params ? params : Object.keys(params)) + '.'
          }})
        }

        orderedParams.push(params[paramName])
      }
    }

    var optional = methods[req.body.method].optional
    if (optional && params) {
      for (i = 0; i < optional.length; i++) {
        //now without throwing an error...
        paramName = optional[i]
        if (params[paramName]) {
          orderedParams.push(params[paramName])
        }
      }
    }

    /* call the method (with or without callback) */
    methodObj = getMethodObj(req.body.method)
    if (!methods[req.body.method].callback) {
      var result = methodObj.method.apply(methodObj.thisObj, orderedParams)
      return respond({result: getFormattedValue(result)})
    }
    // push callback to be last argument
    var callback = function (err, result) {
      if (err) {
        return respond({
          error: {
            code: jsonrpc.INTERNAL_ERROR,
            message: 'Internal error',
            data: err
          }
        })
      }
      respond({result: getFormattedValue(result)})
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

colu.once('connect', function () {
  if (sslCredentials) {
    launchServer('https', sslCredentials)

    if (settings.server.useBoth) {
      launchServer('http')
    }
  } else {
    launchServer('http')
  }
})

colu.once('error', function (err) {
  console.error(err)
  process.exit(-1)
})

colu.init()

var getMethodObj = function (methodName) {
  var methodParts = methodName.split('.')
  var thisObj = colu
  var method = colu[methodParts[0]]
  for (var i = 1; i < methodParts.length; i++) {
    thisObj = method
    method = thisObj[methodParts[i]]
  }
  return {
    method: method,
    thisObj: thisObj
  }
}

// sslCredentials - relevant if and only if (type === 'http')
var launchServer = function (type, sslCredentials) {
  var server = (type === 'https') ? https.createServer(sslCredentials, app) : http.createServer(app)
  var port = (type === 'https') ? settings.server.httpsPort : settings.server.httpPort
  server.listen(port, settings.server.host, function () {
    console.log(type + ' server started on port', port)
  })
  server.on('error', function (err) {
    console.error('err = ', err)
    process.exit(-1)
  })
}

// convert the given result to suitable output to be given as a response
var getFormattedValue = function (result) {
  if (result && (typeof result.getFormattedValue === 'function')) {
    return result.getFormattedValue()
  }
  return result
}

module.exports = app
