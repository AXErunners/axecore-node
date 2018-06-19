'use strict';

// To run the tests: $ mocha -R spec regtest/axed.js

var path = require('path');
var index = require('..');
var log = index.log;

var chai = require('chai');
var axecore = require('@axerunners/axecore-lib');
var BN = axecore.crypto.BN;
var async = require('async');
var rimraf = require('rimraf');
var axed;

/* jshint unused: false */
var should = chai.should();
var assert = chai.assert;
var sinon = require('sinon');
var AxedRPC = require('@axerunners/axed-rpc');
var transactionData = [];
var blockHashes = [];
var utxos;
var client;
var coinbasePrivateKey;
var privateKey = axecore.PrivateKey();
var destKey = axecore.PrivateKey();

describe('Axed Functionality', function() {

  before(function(done) {
    this.timeout(200000);

    // Add the regtest network
    axecore.Networks.enableRegtest();
    var regtestNetwork = axecore.Networks.get('regtest');

    var datadir = __dirname + '/data';

    rimraf(datadir + '/regtest', function(err) {

      if (err) {
        throw err;
      }

      axed = require('../').services.Axe({
        spawn: {
          datadir: datadir,
          exec: path.resolve(__dirname, process.env.HOME, './.axecore/data/axed')
        },
        node: {
          network: regtestNetwork,
          getNetworkName: function() {
            return 'regtest';
          }
        }
      });

      axed.on('error', function(err) {
        log.error('error="%s"', err.message);
      });

      log.info('Waiting for Axe Core to initialize...');

      axed.start(function() {
        log.info('Axed started');

        client = new AxedRPC({
          protocol: 'http',
          host: '127.0.0.1',
          port: 30331,
          user: 'axe',
          pass: 'local321',
          rejectUnauthorized: false
        });

        log.info('Generating 100 blocks...');

        // Generate enough blocks so that the initial coinbase transactions
        // can be spent.

        setImmediate(function() {
          client.generate(150, function(err, response) {
            if (err) {
              throw err;
            }
            blockHashes = response.result;

            log.info('Preparing test data...');

            // Get all of the unspent outputs
            client.listUnspent(0, 150, function(err, response) {
              utxos = response.result;

              async.mapSeries(utxos, function(utxo, next) {
                async.series([
                  function(finished) {
                    // Load all of the transactions for later testing
                    client.getTransaction(utxo.txid, function(err, txresponse) {
                      if (err) {
                        throw err;
                      }
                      // add to the list of transactions for testing later
                      transactionData.push(txresponse.result.hex);
                      finished();
                    });
                  },
                  function(finished) {
                    // Get the private key for each utxo
                    client.dumpPrivKey(utxo.address, function(err, privresponse) {
                      if (err) {
                        throw err;
                      }
                      utxo.privateKeyWIF = privresponse.result;
                      finished();
                    });
                  }
                ], next);
              }, function(err) {
                if (err) {
                  throw err;
                }
                done();
              });
            });
          });
        });
      });
    });
  });

  after(function(done) {
    this.timeout(60000);
    axed.node.stopping = true;
    axed.stop(function(err, result) {
      done();
    });
  });

  describe('get blocks by hash', function() {

    [0,1,2,3,5,6,7,8,9].forEach(function(i) {
      it('generated block ' + i, function(done) {
        axed.getBlock(blockHashes[i], function(err, block) {
          if (err) {
            throw err;
          }
          should.exist(block);
          block.hash.should.equal(blockHashes[i]);
          done();
        });
      });
    });
  });

  describe('get blocks as buffers', function() {
    [0,1,2,3,5,6,7,8,9].forEach(function(i) {
      it('generated block ' + i, function(done) {
        axed.getRawBlock(blockHashes[i], function(err, block) {
          if (err) {
            throw err;
          }
          should.exist(block);
          (block instanceof Buffer).should.equal(true);
          done();
        });
      });
    });
  });

  describe('get errors as error instances', function() {
    it('will wrap an rpc into a javascript error', function(done) {
      axed.client.getBlock(1000000000, function(err, response) {
        var error = axed._wrapRPCError(err);
        (error instanceof Error).should.equal(true);
        error.message.should.equal(err.message);
        error.code.should.equal(err.code);
        should.exist(error.stack);
        done();
      });
    });
  });

  describe('get blocks by height', function() {

    [0,1,2,3,4,5,6,7,8,9].forEach(function(i) {
      it('generated block ' + i, function(done) {
        // add the genesis block
        var height = i + 1;
        axed.getBlock(i + 1, function(err, block) {
          if (err) {
            throw err;
          }
          should.exist(block);
          block.hash.should.equal(blockHashes[i]);
          done();
        });
      });
    });

    it('will get error with number greater than tip', function(done) {
      axed.getBlock(1000000000, function(err, response) {
        should.exist(err);
        err.code.should.equal(-8);
        done();
      });
    });

  });

  describe('get transactions by hash', function() {
    [0,1,2,3,4,5,6,7,8,9].forEach(function(i) {
      it('for tx ' + i, function(done) {
        var txhex = transactionData[i];
        var tx = new axecore.Transaction();
        tx.fromString(txhex);
        axed.getTransaction(tx.hash, function(err, response) {
          if (err) {
            throw err;
          }
          assert(response.toString('hex') === txhex, 'incorrect tx data result');
          done();
        });
      });
    });

    it('will return error if the transaction does not exist', function(done) {
      var txid = '6226c407d0e9705bdd7158e60983e37d0f5d23529086d6672b07d9238d5aa618';
      axed.getTransaction(txid, function(err, response) {
        should.exist(err);
        done();
      });
    });
  });

  describe('get transactions as buffers', function() {
    [0,1,2,3,4,5,6,7,8,9].forEach(function(i) {
      it('for tx ' + i, function(done) {
        var txhex = transactionData[i];
        var tx = new axecore.Transaction();
        tx.fromString(txhex);
        axed.getRawTransaction(tx.hash, function(err, response) {
          if (err) {
            throw err;
          }
          response.should.be.instanceOf(Buffer);
          assert(response.toString('hex') === txhex, 'incorrect tx data result');
          done();
        });
      });
    });

    it('will return error if the transaction does not exist', function(done) {
      var txid = '6226c407d0e9705bdd7158e60983e37d0f5d23529086d6672b07d9238d5aa618';
      axed.getRawTransaction(txid, function(err, response) {
        should.exist(err);
        done();
      });
    });
  });

  describe('get block header', function() {
    var expectedWork = new BN(6);
    [1,2,3,4,5,6,7,8,9].forEach(function(i) {
      it('generate block ' + i, function(done) {
        axed.getBlockHeader(blockHashes[i], function(err, blockIndex) {
          if (err) {
            return done(err);
          }
          should.exist(blockIndex);
          should.exist(blockIndex.chainWork);
          var work = new BN(blockIndex.chainWork, 'hex');
          work.toString(16).should.equal(expectedWork.toString(16));
          expectedWork = expectedWork.add(new BN(2));
          should.exist(blockIndex.prevHash);
          blockIndex.hash.should.equal(blockHashes[i]);
          blockIndex.prevHash.should.equal(blockHashes[i - 1]);
          blockIndex.height.should.equal(i + 1);
          done();
        });
      });
    });
    it('will get null prevHash for the genesis block', function(done) {
      axed.getBlockHeader(0, function(err, header) {
        if (err) {
          return done(err);
        }
        should.exist(header);
        should.equal(header.prevHash, undefined);
        done();
      });
    });
    it('will get error for block not found', function(done) {
      axed.getBlockHeader('notahash', function(err, header) {
        should.exist(err);
        done();
      });
    });
  });

  describe('get block index by height', function() {
    var expectedWork = new BN(6);
    [2,3,4,5,6,7,8,9].forEach(function(i) {
      it('generate block ' + i, function() {
        axed.getBlockHeader(i, function(err, header) {
          should.exist(header);
          should.exist(header.chainWork);
          var work = new BN(header.chainWork, 'hex');
          work.toString(16).should.equal(expectedWork.toString(16));
          expectedWork = expectedWork.add(new BN(2));
          should.exist(header.prevHash);
          header.hash.should.equal(blockHashes[i - 1]);
          header.prevHash.should.equal(blockHashes[i - 2]);
          header.height.should.equal(i);
        });
      });
    });
    it('will get error with number greater than tip', function(done) {
      axed.getBlockHeader(100000, function(err, header) {
        should.exist(err);
        done();
      });
    });
  });

  describe('send transaction functionality', function() {

    it('will not error and return the transaction hash', function(done) {

      // create and sign the transaction
      var tx = axecore.Transaction();
      tx.from(utxos[0]);
      tx.change(privateKey.toAddress());
      tx.to(destKey.toAddress(), utxos[0].amount * 1e8 - 1000);
      tx.sign(axecore.PrivateKey.fromWIF(utxos[0].privateKeyWIF));

      // test sending the transaction
      axed.sendTransaction(tx.serialize(), function(err, hash) {
        if (err) {
          return done(err);
        }
        hash.should.equal(tx.hash);
        done();
      });

    });

    it('will throw an error if an unsigned transaction is sent', function(done) {
      var tx = axecore.Transaction();
      tx.from(utxos[1]);
      tx.change(privateKey.toAddress());
      tx.to(destKey.toAddress(), utxos[1].amount * 1e8 - 1000);
      axed.sendTransaction(tx.uncheckedSerialize(), function(err, hash) {
        should.exist(err);
        (err instanceof Error).should.equal(true);
        should.not.exist(hash);
        done();
      });
    });

    it('will throw an error for unexpected types (tx decode failed)', function(done) {
      var garbage = new Buffer('abcdef', 'hex');
      axed.sendTransaction(garbage, function(err, hash) {
        should.exist(err);
        should.not.exist(hash);
        var num = 23;
        axed.sendTransaction(num, function(err, hash) {
          should.exist(err);
          (err instanceof Error).should.equal(true);
          should.not.exist(hash);
          done();
        });
      });
    });

    it('will emit "tx" events', function(done) {
      var tx = axecore.Transaction();
      tx.from(utxos[2]);
      tx.change(privateKey.toAddress());
      tx.to(destKey.toAddress(), utxos[2].amount * 1e8 - 1000);
      tx.sign(axecore.PrivateKey.fromWIF(utxos[2].privateKeyWIF));

      var serialized = tx.serialize();

      axed.once('tx', function(buffer) {
        buffer.toString('hex').should.equal(serialized);
        done();
      });
      axed.sendTransaction(serialized, function(err, hash) {
        if (err) {
          return done(err);
        }
        should.exist(hash);
      });
    });

  });

  describe('fee estimation', function() {
    it('will estimate fees', function(done) {
      axed.estimateFee(1, function(err, fees) {
        if (err) {
          return done(err);
        }
        fees.should.equal(-1);
        done();
      });
    });
  });

  describe('tip updates', function() {
    it('will get an event when the tip is new', function(done) {
      this.timeout(4000);
      axed.on('tip', function(height) {
        if (height === 151) {
          done();
        }
      });
      client.generate(1, function(err, response) {
        if (err) {
          throw err;
        }
      });
    });
  });

  describe('get detailed transaction', function() {
    it('should include details for coinbase tx', function(done) {
      axed.getDetailedTransaction(utxos[0].txid, function(err, tx) {
        if (err) {
          return done(err);
        }
        should.exist(tx.height);
        tx.height.should.be.a('number');
        should.exist(tx.blockTimestamp);
        should.exist(tx.blockHash);
        tx.coinbase.should.equal(true);
        tx.version.should.equal(1);
        tx.hex.should.be.a('string');
        tx.locktime.should.equal(0);
        tx.feeSatoshis.should.equal(0);
        tx.outputSatoshis.should.equal(500 * 1e8);
        tx.inputSatoshis.should.equal(0);
        tx.inputs.length.should.equal(1);
        tx.outputs.length.should.equal(1);
        should.equal(tx.inputs[0].prevTxId, null);
        should.equal(tx.inputs[0].outputIndex, null);
        tx.inputs[0].script.should.be.a('string');
        should.equal(tx.inputs[0].scriptAsm, null);
        should.equal(tx.inputs[0].address, null);
        should.equal(tx.inputs[0].satoshis, null);
        tx.outputs[0].satoshis.should.equal(500 * 1e8);
        tx.outputs[0].script.should.be.a('string');
        tx.outputs[0].scriptAsm.should.be.a('string');
        tx.outputs[0].spentTxId.should.be.a('string');
        tx.outputs[0].spentIndex.should.equal(0);
        tx.outputs[0].spentHeight.should.be.a('number');
        tx.outputs[0].address.should.be.a('string');
        tx.txlock.should.equal(false);
        done();
      });
    });
  });

  describe('#getInfo', function() {
    it('will get information', function(done) {
      axed.getInfo(function(err, info) {
        if (err) {
          return done(err);
        }
        info.network.should.equal('regtest');
        should.exist(info);
        should.exist(info.version);
        should.exist(info.blocks);
        should.exist(info.timeOffset);
        should.exist(info.connections);
        should.exist(info.difficulty);
        should.exist(info.testnet);
        should.exist(info.relayFee);
        should.exist(info.errors);
        done();
      });
    });
  });

});
