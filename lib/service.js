/* The based service function*/

var events = require('events')
  , inherits = require('util').inherits
  , fivebeans = require('fivebeans')
  , ssdb = require('ssdb')
  , configs = require('./configs')
  , patches = require('./util').patches
  , log = require('./util').log
  , fatal = require('./util').fatal
;

function Service() { events.EventEmitter.call(this) };
inherits(Service, events.EventEmitter);


/*
 * create this service a beanstalkd client
 */

Service.prototype.createBeansClient = function(){
  var host = configs.beanstalkd.host
    , port = configs.beanstalkd.port
  ;
  this.beans = new fivebeans.client(host, port);
  patches.patchBeansClient(this.beans);
  return this.beans;
}


/*
 * connect beanstalkd the sync like way
 */
Service.prototype.connectBeans = function *(action) {
  var self = this
    , beans = this.beans
    , tube = configs.beanstalkd.tube
    , action = action || 'use'  // use/watch
    , _action = {use: 'using', watch: 'watching'}[action]
  ;

  beans.on('connect', function(){
    beans[action](tube, function(e, _){
      log.info("Beanstalkd connected, %s tube '%s'", _action, tube);
      self.emit('beans connected');
    });
  }).connect();

  beans.on('error', function(err){fatal('Beanstalkd connect error: %s', err)});

  yield function(done) {self.on('beans connected', done)};
}


/*
 * create this service a ssdb client
 */

Service.prototype.createSsdbClient = function() {
  var options = {port: configs.ssdb.port, host: configs.ssdb.host};
  this.ssdb = ssdb.createClient(options).thunkify();
  this.ssdb.on('error', function(err){ fatal('SSDB connect error: %s', err);});
  return this.ssdb;
}

exports = module.exports = Service;
