var util = require('util')
  , clone = require('clone');


/**
 * l is an object JSON.parse(link.json)
 */

module.exports = function(erlanger, l){

  var e_l = clone(l); //the erlangified l

  //expand observed (link)
  e_l.observed.forEach(function(obs){

    var res = []; 

    if(typeof obs.definition[0] == 'object'){  //incidence

      obs.definition.forEach(function(r){
        res = res.concat(erlanger.erlangify_reaction(r));
      });

    } else { //prevalence

      res = erlanger.expand_state_list(obs.definition);

    }

    obs.definition = res;

  });

  return e_l;

}
