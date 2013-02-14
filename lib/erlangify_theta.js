var  util = require('util')
  , clone = require('clone')
  , Erlang = require('./erlang');

/**
 * t is an object JSON.parse(theta.json)
 * def is the erlang expansion definition provdided by the user
 */

module.exports = function(t, def){

  var e_t = clone(t); //the erlangified t

  var erlang = new Erlang(def);

  for(var s in erlang.state){

    if (!(s + '@0' in e_t.value)) {

      var mystate = clone(e_t.value[s]);
      delete e_t.value[s];

      for(var i=0; i< erlang.state[s].shape; i++){
        var e_name = s + '@' + i;
        e_t.value[e_name] = clone(mystate);
        
        ['min', 'guess', 'max', 'sd_transf'].forEach(function(el){
          if(el in e_t.value[e_name]){
            if(typeof e_t.value[e_name][el] === 'object' ){
              for(g in e_t.value[e_name][el]){
                e_t.value[e_name][el][g] /= erlang.state[s].shape;
              }
            } else {
              e_t.value[e_name][el] /= erlang.state[s].shape;
            }
          }
        });
      }
    }

    if(erlang.state[s].shape>0){
      for(var i=1; i< erlang.state[s].shape; i++){
        e_t.value[s + '@' + i]['follow'] = s + '@0';
      }
    }

  };

  return e_t;
}
