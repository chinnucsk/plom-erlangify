var  util = require('util')
  , clone = require('clone')
  , Erlang = require('./erlang');

/**
 * expand state variables objects
 */
function erlangify_pstate(erlang, state){

  var expanded = [];
  state.forEach(function(s){

    if(s.id in erlang.state){
      for(var i=0; i< erlang.state[s.id].shape; i++){
        var mys = clone(s);
        mys.id = s.id + '@' + i;
        if(mys.comment){
          mys.comment +=  util.format(' (Erlang expanded (@%d))', i);
        }

        expanded.push(mys);
      }
    } else {
      expanded.push(clone(s));    
    }  

  });

  return expanded;
}


/**
 *Within compartment expansion E@0->E@1, E@1->E@2, ...
 */

function within_state_reactions(erlang){

  var e_within = [];

  for(var s in erlang.state){
    for(var i = 0; i< erlang.state[s].shape-1; i++){
      e_within.push({
        from: s + '@' + i,
        to: s + '@' + (i+1),
        rate: erlang.expand_state_in_rate(erlang.rescale(erlang.state[s].rate, s))
      });
    }
  }

  return e_within;
}


/**
 * p is an object JSON.parse(process.json)
 * def is the erlang expansion definition provdided by the user
 */

module.exports = function(p, def){

  var e_p = clone(p); //the erlangified p

  var erlang = new Erlang(def);

  //expand state
  e_p.state = erlangify_pstate(erlang, p.state);
  
  //expand process model
  e_p.model = []; 
  p.model.forEach(function(r){  
    e_p.model = e_p.model.concat(erlang.erlangify_reaction(r));
  });
  e_p.model = e_p.model.concat(within_state_reactions(erlang));

  //expand white_noise
  e_p.white_noise.forEach(function(white_noise){

    var res = []; 
    white_noise.reaction.forEach(function(r){
      res = res.concat(erlang.erlangify_reaction(r));
    });
    white_noise.reaction = res;

  });

  return e_p;
}
