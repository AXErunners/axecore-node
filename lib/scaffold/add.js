'use strict';

var async = require('async');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var axecore = require('@axerunners/axecore-lib');
var utils = require('../utils');
var $ = axecore.util.preconditions;
var _ = axecore.deps._;

/**
 * @param {String} configFilePath - The absolute path to the configuration file
 * @param {String} service - The name of the service
 * @param {Function} done
 */
function addConfig(configFilePath, service, done) {
  $.checkState(utils.isAbsolutePath(configFilePath), 'An absolute path is expected');
  fs.readFile(configFilePath, function(err, data) {
    if (err) {
      return done(err);
    }
    var config = JSON.parse(data);
    $.checkState(
      Array.isArray(config.services),
      'Configuration file is expected to have a services array.'
    );
    config.services.push(service);
    config.services = _.uniq(config.services);
    config.services.sort(function(a, b) {
      return a > b;
    });
    fs.writeFile(configFilePath, JSON.stringify(config, null, 2), done);
  });
}

/**
 * @param {String} configDir - The absolute configuration directory path
 * @param {String} service - The name of the service
 * @param {Function} done
 */
function addService(configDir, service, done) {
  $.checkState(utils.isAbsolutePath(configDir), 'An absolute path is expected');
  var npm = spawn('npm', ['install', service, '--save'], {cwd: configDir});

  npm.stdout.on('data', function(data) {
    process.stdout.write(data);
  });

  npm.stderr.on('data', function(data) {
    process.stderr.write(data);
  });

  npm.on('close', function(code) {
    if (code !== 0) {
      return done(new Error('There was an error installing service: ' + service));
    } else {
      return done();
    }
  });
}

/**
 * @param {String} options.cwd - The current working directory
 * @param {String} options.dirname - The axecore-node configuration directory
 * @param {Array} options.services - An array of strings of service names
 * @param {Function} done - A callback function called when finished
 */
function add(options, done) {
  $.checkArgument(_.isObject(options));
  $.checkArgument(_.isFunction(done));
  $.checkArgument(
    _.isString(options.path) && utils.isAbsolutePath(options.path),
    'An absolute path is expected'
  );
  $.checkArgument(Array.isArray(options.services));

  var configPath = options.path;
  var services = options.services;

  var axecoreConfigPath = path.resolve(configPath, 'axecore-node.json');
  var packagePath = path.resolve(configPath, 'package.json');

  if (!fs.existsSync(axecoreConfigPath) || !fs.existsSync(packagePath)) {
    return done(
      new Error('Directory does not have a axecore-node.json and/or package.json file.')
    );
  }

  var oldPackage = JSON.parse(fs.readFileSync(packagePath));

  async.eachSeries(
    services,
    function(service, next) {
      // npm install <service_name> --save
      addService(configPath, service, function(err) {
        if (err) {
          return next(err);
        }

        // get the name of the service from package.json
        var updatedPackage = JSON.parse(fs.readFileSync(packagePath));
        var newDependencies = _.difference(
          Object.keys(updatedPackage.dependencies),
          Object.keys(oldPackage.dependencies)
        );
        $.checkState(newDependencies.length === 1);
        oldPackage = updatedPackage;
        var serviceName = newDependencies[0];

        // add service to axecore-node.json
        addConfig(axecoreConfigPath, serviceName, next);
      });
    }, done
  );
}

module.exports = add;
