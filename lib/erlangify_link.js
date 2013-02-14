var  util = require('util')
  , clone = require('clone')
  , Erlang = require('./erlang');


/**
 * l is an object JSON.parse(link.json)
 * def is the erlang expansion definition provdided by the user
 */

module.exports = function(l, def){

  var e_l = clone(l); //the erlangified l

  var erlang = new Erlang(def);

  //expand observed (link)
  e_l.observed.forEach(function(obs){

    var res = []; 

    if(typeof obs.definition[0] == 'object'){  //incidence

      obs.definition.forEach(function(r){
        res = res.concat(erlang.erlangify_reaction(r));
      });

    } else { //prevalence

      res = erlang.expand_state_list(obs.definition);

    }

    obs.definition = res;

  });

  return e_l;

}
