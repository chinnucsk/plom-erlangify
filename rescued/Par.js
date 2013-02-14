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


module.exports = Par;
