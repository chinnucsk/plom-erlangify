var clone = require('clone')
  , loadJSON = require('./load').loadJSON
  , _ = require('underscore')
  , fs = require('fs');


/**
 * Get JSON, and create cac_id, ts_id par_sv, par_proc, par_obs containing the
 * erlang states and the parameter coming from context.
 */

function Par(thetaPath, contextPath, processPath, linkPath){

  this.theta = loadJSON(thetaPath);
  this.context = loadJSON(contextPath);
  this.process = loadJSON(processPath);
  this.link = loadJSON(linkPath);

  //add erlang states
  var erlang = [];
  this.process.model.forEach(function(reaction){
    if(reaction.from === reaction.to){
      erlang.push({state: reaction.from, shape: reaction.tag[0]['shape']});
    }
  });

  this.erlang = erlang;


  var par_sv = this.process.state.map(function(x) {return x.id});
  par_sv = _.difference(par_sv, this.erlang.map(function(x) {return x.state}));
  this.erlang.forEach(function(x){
    for(var i=0; i< x.shape; i++){
      par_sv.push(x.state+i);
    }
  })

  this.par_sv = par_sv;

  //add iotas (if 'external' in context.model.space.external array)
  this.iotas = [];
  if(this.context.model && ('space' in this.context.model)
     && ('type' in this.context.model.space)
     && (this.context.model.space.type.indexOf('external') !== -1)){

    var infectors = [];
    this.process.model.forEach(function(reaction){
      if(reaction.tag && (reaction.tag[0]['id'] === 'transmission')){
        infectors = infectors.concat(reaction.tag[0]['by']);
      }
    });
    this.iotas = _.uniq(infectors).map(function(x, i){return 'iota_' + i});
  }


  this.par_proc = this.iotas.concat(this.process.parameter.map(function(x) {return x.id}));
  this.par_obs = this.link.parameter.map(function(x) {return x.id});

  //remove par_fixed
  if(this.context.data){
    this.par_proc = _.difference(this.par_proc, this.context.data.map(function(x) {return x.id}));
    this.par_obs = _.difference(this.par_obs, this.context.data.map(function(x) {return x.id}));
  }


  this.cac_id = this.context.population.map(function(x){return x.id});
  this.ts_id = this.context.time_series.map(function(x){return x.id});


}


Par.prototype.addErlang = function(){

  var theta = this.theta;

  this.erlang.forEach(function(x){
    if (!(x.state + '0' in theta.value)) {
      var mystate = clone(theta.value[x.state])
      delete theta.value[x.state];

      for(var i=0; i< x.shape; i++){
        theta.value[x.state + i] = clone(mystate);

        ['min', 'guess', 'max', 'sd_transf'].forEach(function(el){
          if(el in theta.value[x.state + i]){
            if(typeof theta.value[x.state + i][el] === 'object' ){
              for(g in theta.value[x.state + i][el]){
                theta.value[x.state + i][el][g] /= x.shape;
              }
            } else {
              theta.value[x.state + i][el] /= x.shape;
            }
          }
        });
      }
    }

    if(x.shape>0){
      for(var i=1; i< x.shape; i++){
        theta.value[x.state + i]['follow'] = x.state + '0';
      }
    }

  });

}

Par.prototype.addIotas = function(){

  var theta = this.theta;

  this.iotas.forEach(function(par){
    theta.value[par] = {'guess': 0.0};
  });

}


Par.prototype.addDefaults = function(){
  var theta = this.theta;

  //transformation
  //par_sv default to 'logit'
  this.par_sv.forEach(function(state){
      theta.value[state]['transformation'] = theta.value[state]['transformation'] || 'logit';
  });

  //par_proc and par_obs default to 'positive'
  this.par_proc.concat(this.par_obs).forEach(function(par){
      theta.value[par]['transformation'] = theta.value[par]['transformation'] || 'log';
  });

  var that = this;

  //min, max,  sd_transf, prior
  this.par_sv.concat(this.par_proc, this.par_obs).forEach(function(par, i){

    if('follow' in theta.value[par] && !('guess' in theta.value[par])) {
      theta.value[par]['guess'] = 0.0;
    }

    if(!('min' in theta.value[par])) {theta.value[par]['min'] = clone(theta.value[par]['guess'])};
    if(!('max' in theta.value[par])) {theta.value[par]['max'] = clone(theta.value[par]['guess'])};
    if(!('sd_transf' in theta.value[par])) {theta.value[par]['sd_transf'] = 0.0};
    theta.value[par]['prior'] = theta.value[par]['prior'] || 'uniform';

    theta.value[par]['partition_id'] = theta.value[par]['partition_id'] || ((i < (that.par_sv.length + that.par_proc.length)) ? 'identical_population': 'identical_time_series');
  });
}


Par.prototype.repeat = function() {
  var theta = this.theta;

  theta.partition = theta.partition || {};

  theta.partition['variable_population'] = {group: []};
  this.cac_id.forEach(function(cac){
    theta.partition['variable_population']['group'].push({'id': cac, 'population_id': [cac]});
  });

  theta.partition['variable_time_series'] = {group: []};
  this.ts_id.forEach(function(ts){
    theta.partition['variable_time_series']['group'].push({'id': ts, 'time_series_id': [ts]});
  });

  theta.partition['identical_population'] = {group: [{'id':'all', 'population_id': this.cac_id}]};
  theta.partition['identical_time_series'] = {group: [{'id':'all', 'time_series_id': this.ts_id}]};

  for(par in theta.value){
    ['min', 'guess', 'max', 'sd_transf'].forEach(function(el){
      if(typeof theta.value[par][el] !== 'object'){
        var my_value = theta.value[par][el];
        theta.value[par][el] = {};
        theta.partition[theta.value[par]['partition_id']]['group'].forEach(function(group){
          theta.value[par][el][group.id] = my_value;
        });
      }
    });
  }


}


module.exports = Par;
