# Colu-Node.Js
[![Build Status](https://travis-ci.org/Colu-platform/colu-nodejs.svg?branch=master)](https://travis-ci.org/Colu-platform/colu-nodejs) [![Coverage Status](https://coveralls.io/repos/Colu-platform/colu-nodejs/badge.svg?branch=master)](https://coveralls.io/r/Colu-platform/colu-nodejs?branch=master)
[![npm version](https://badge.fury.io/js/colu.svg)](http://badge.fury.io/js/colu)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Using

### Installation

```sh
$ npm i colu
```

### Documentation 

Full documentation for this Module can be found here: [http://documentation.colu.co/](http://documentation.colu.co/#1.SDK)

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

And now you can use [JSON-RPC 2.0](http://www.jsonrpc.org/specification) requests to use the Colu SDK.
By default it will be hosted at : 127.0.0.1:80 and will be locked to local host only.

## Developing

### Testing

```sh
$ npm test
```

### Docker

#### Build image
```
	docker build -t colunodejs .
```

#### Run image in a container

```
	docker run -p 8080:80 -it colunodejs
```
You should now be able to make your api calls to port 8080 on your host machine (or select another port, say 1234, by running instead with `docker run -p 1234:80 -it colunodejs`)

#### View your container running
````
  docker ps
````

#### Stopping the container
Since we are running in interactive shell mode `-it` you can stop the container by pressing `CTRL+C`