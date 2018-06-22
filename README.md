AXEcore Node
============
[![NPM Version](https://img.shields.io/npm/v/@axerunners/axecore-node.svg?branch=master)](https://npmjs.org/package/@axerunners/axecore-node)
[![Build Status](https://travis-ci.com/charlesrocket/axecore-node.svg?branch=master)](https://travis-ci.com/charlesrocket/axecore-node)

An Axe full node for building applications and services with Node.js. A node is extensible and can be configured to run additional services. At the minimum a node has an interface to [AXE Core (axed)](https://github.com/axerunners/axe/tree/master) for more advanced address queries. Additional services can be enabled to make a node more useful such as exposing new APIs, running a block explorer and wallet service.

## Usages

### As a standalone server

```bash
git clone https://github.com/axerunners/axecore-node
cd axecore-node
./bin/axecore-node start
```

When running the start command, it will seek for a .axecore folder with a axecore-node.json conf file.
If it doesn't exist, it will create it, with basic task to connect to axed.

Some plugins are available :

- Insight-API : `./bin/axecore-node addservice @axerunners/insight-api
- Insight-UI : `./bin/axecore-node addservice @axerunners/insight-ui`

You also might want to add these index to your axe.conf file :
```
-addressindex
-timestampindex
-spentindex
```

### As a library

```bash
npm install @axerunners/axecore-node
```

```javascript
const axecore = require('@axerunners/axecore-node');
const config = require('./axecore-node.json');

let node = axecore.scaffold.start({ path: "", config: config });
node.on('ready', function() {
    //Axe core started
    axed.on('tx', function(txData) {
        let tx = new axecore.lib.Transaction(txData);
    });
});
```

## Prerequisites

- Axe Core (axed) (v0.12.1.x) with support for additional indexing *(see above)*
- Node.js v0.10, v0.12, v4 or v5
- ZeroMQ *(libzmq3-dev for Ubuntu/Debian or zeromq on OSX)*
- ~20GB of disk storage
- ~1GB of RAM

## Configuration

Axecore includes a Command Line Interface (CLI) for managing, configuring and interfacing with your Axecore Node.

```bash
axecore-node create -d <axe-data-dir> mynode
cd mynode
axecore-node install <service>
axecore-node install https://github.com/yourname/helloworld
axecore-node start
```

This will create a directory with configuration files for your node and install the necessary dependencies.

Please note that [Axe Core](https://github.com/axerunners/axe/tree/master) needs to be installed first.

For more information about (and developing) services, please see the [Service Documentation](docs/services.md).

## Add-on Services

There are several add-on services available to extend the functionality of Bitcore:

- [Insight API](https://github.com/axerunners/insight-api/tree/master)
- [Insight UI](https://github.com/axerunners/insight-ui/tree/master)
- [Bitcore Wallet Service](https://github.com/AXErunners/bitcore-wallet-service-axe)

## Documentation

- [Upgrade Notes](docs/upgrade.md)
- [Services](docs/services.md)
  - [Axed](docs/services/axed.md) - Interface to Axe Core
  - [Web](docs/services/web.md) - Creates an express application over which services can expose their web/API content
- [Development Environment](docs/development.md) - Guide for setting up a development environment
- [Node](docs/node.md) - Details on the node constructor
- [Bus](docs/bus.md) - Overview of the event bus constructor
- [Release Process](docs/release.md) - Information about verifying a release and the release process.


## Setting up dev environment (with Insight)

Prerequisite : Having a axed node already runing `axed --daemon`.

Axecore-node : `git clone https://github.com/axerunners/axecore-node -b develop`
Insight-api (optional) : `git clone https://github.com/axerunners/insight-api -b develop`
Insight-UI (optional) : `git clone https://github.com/axerunners/insight-ui -b develop`

Install them :
```
cd axecore-node && npm install \
 && cd ../insight-ui && npm install \
 && cd ../insight-api && npm install && cd ..
```

Symbolic linking in parent folder :
```
npm link ../insight-api
npm link ../insight-ui
```

Start with `./bin/axecore-node start` to first generate a ~/.axecore/axecore-node.json file.
Append this file with `"@axerunners/insight-ui"` and `"@axerunners/insight-api"` in the services array.

## Contributing

Please send pull requests for bug fixes, code optimization, and ideas for improvement. For more information on how to contribute, please refer to our [CONTRIBUTING](https://github.com/axerunners/axecore/blob/master/CONTRIBUTING.md) file.

## License

Code released under [the MIT license](https://github.com/axerunners/axecore-node/blob/master/LICENSE).

Copyright 2013-2015 BitPay, Inc.

- bitcoin: Copyright (c) 2009-2015 Bitcoin Core Developers (MIT License)
