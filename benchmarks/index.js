'use strict';

var benchmark = require('benchmark');
var axedRPC = require('@axerunners/axed-rpc');
var async = require('async');
var maxTime = 20;

console.log('Axe Service native interface vs. Axe JSON RPC interface');
console.log('----------------------------------------------------------------------');

// To run the benchmarks a fully synced Axe Core directory is needed. The RPC comands
// can be modified to match the settings in axe.conf.

var fixtureData = {
  blockHashes: [
    '00000000fa7a4acea40e5d0591d64faf48fd862fa3561d111d967fc3a6a94177',
    '000000000017e9e0afc4bc55339f60ffffb9cbe883f7348a9fbc198a486d5488',
    '000000000019ddb889b534c5d85fca2c91a73feef6fd775cd228dea45353bae1',
    '0000000000977ac3d9f5261efc88a3c2d25af92a91350750d00ad67744fa8d03'
  ],
  txHashes: [
    '5523b432c1bd6c101bee704ad6c560fd09aefc483f8a4998df6741feaa74e6eb',
    'ff48393e7731507c789cfa9cbfae045b10e023ce34ace699a63cdad88c8b43f8',
    '5d35c5eebf704877badd0a131b0a86588041997d40dbee8ccff21ca5b7e5e333',
    '88842f2cf9d8659c3434f6bc0c515e22d87f33e864e504d2d7117163a572a3aa',
  ]
};

var axed = require('../').services.Axe({
  node: {
    datadir: process.env.HOME + '/.axe',
    network: {
      name: 'testnet'
    }
  }
});

axed.on('error', function(err) {
  console.error(err.message);
});

axed.start(function(err) {
  if (err) {
    throw err;
  }
  console.log('Axe Core started');
});

axed.on('ready', function() {

  console.log('Axe Core ready');

  var client = new axedRPC({
    host: 'localhost',
    port: 18332,
    user: 'axe',
    pass: 'local321'
  });

  async.series([
    function(next) {

      var c = 0;
      var hashesLength = fixtureData.blockHashes.length;
      var txLength = fixtureData.txHashes.length;

      function axedGetBlockNative(deffered) {
        if (c >= hashesLength) {
          c = 0;
        }
        var hash = fixtureData.blockHashes[c];
        axed.getBlock(hash, function(err, block) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      function axedGetBlockJsonRpc(deffered) {
        if (c >= hashesLength) {
          c = 0;
        }
        var hash = fixtureData.blockHashes[c];
        client.getBlock(hash, false, function(err, block) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      function axeGetTransactionNative(deffered) {
        if (c >= txLength) {
          c = 0;
        }
        var hash = fixtureData.txHashes[c];
        axed.getTransaction(hash, true, function(err, tx) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      function axeGetTransactionJsonRpc(deffered) {
        if (c >= txLength) {
          c = 0;
        }
        var hash = fixtureData.txHashes[c];
        client.getRawTransaction(hash, function(err, tx) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      var suite = new benchmark.Suite();

      suite.add('axed getblock (native)', axedGetBlockNative, {
        defer: true,
        maxTime: maxTime
      });

      suite.add('axed getblock (json rpc)', axedGetBlockJsonRpc, {
        defer: true,
        maxTime: maxTime
      });

      suite.add('axed gettransaction (native)', axeGetTransactionNative, {
        defer: true,
        maxTime: maxTime
      });

      suite.add('axed gettransaction (json rpc)', axeGetTransactionJsonRpc, {
        defer: true,
        maxTime: maxTime
      });

      suite
        .on('cycle', function(event) {
          console.log(String(event.target));
        })
        .on('complete', function() {
          console.log('Fastest is ' + this.filter('fastest').pluck('name'));
          console.log('----------------------------------------------------------------------');
          next();
        })
        .run();
    }
  ], function(err) {
    if (err) {
      throw err;
    }
    console.log('Finished');
    axed.stop(function(err) {
      if (err) {
        console.error('Fail to stop services: ' + err);
        process.exit(1);
      }
      process.exit(0);
    });
  });
});
