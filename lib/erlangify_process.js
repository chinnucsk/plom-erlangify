var util = require('util')
  , clone = require('clone');

/**
 * expand state variables objects
 */
function erlangify_pstate(erlanger, state){

  var expanded = [];
  state.forEach(function(s){

    if(s.id in erlanger.state){
      for(var i=0; i< erlanger.state[s.id].shape; i++){
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

function within_state_reactions(erlanger){

  var e_within = [];

  for(var s in erlanger.state){
    for(var i = 0; i< erlanger.state[s].shape-1; i++){
      e_within.push({
        from: s + '@' + i,
        to: s + '@' + (i+1),
        rate: erlanger.expand_state_in_rate(erlanger.rescale(erlanger.state[s].rate, s))
      });
    }
  }

  return e_within;
}


/**
 * p is an object JSON.parse(process.json)
 */

module.exports = function(erlanger, p){

  var e_p = clone(p); //the erlangified p

  //expand state
  e_p.state = erlangify_pstate(erlanger, p.state);
  
  //expand process model
  e_p.model = []; 
  p.model.forEach(function(r){  
    e_p.model = e_p.model.concat(erlanger.erlangify_reaction(r));
  });
  e_p.model = e_p.model.concat(within_state_reactions(erlanger));

  //expand white_noise
  e_p.white_noise.forEach(function(white_noise){

    var res = []; 
    white_noise.reaction.forEach(function(r){
      res = res.concat(erlanger.erlangify_reaction(r));
    });
    white_noise.reaction = res;

  });

  return e_p;
}
