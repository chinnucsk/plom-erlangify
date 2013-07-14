var util = require('util')
  , clone = require('clone');

/**
 * t is an object JSON.parse(theta.json)
 */

module.exports = function(erlanger, t){

  var e_t = clone(t); //the erlangified t
  var props = ['min', 'guess', 'max', 'sd_transf'];

  for(var s in erlanger.state){

    if (!(s + '_0' in e_t.parameter)) {

      var mystate = clone(e_t.parameter[s]);
      delete e_t.parameter[s];

      for(var i=0; i< erlanger.state[s].shape; i++){
        var e_name = s + '_' + i;
        e_t.parameter[e_name] = clone(mystate);
        
        if('group' in e_t.parameter[e_name]){
          for(var g in e_t.parameter[e_name]['group']){
            props.forEach(function(el){
              if(el in e_t.parameter[e_name]['group'][g]){
                e_t.parameter[e_name]['group'][g][el] /= erlanger.state[s].shape;
              }
            });
          }
        } else {
          props.forEach(function(el){
            if(el in e_t.parameter[e_name]){
              e_t.parameter[e_name][el] /= erlanger.state[s].shape;
            }
          });
        }
      }
    }

    if(erlanger.state[s].shape>0){
      for(var i=1; i< erlanger.state[s].shape; i++){
        e_t.parameter[s + '_' + i]['follow'] = s + '_0';
      }
    }

  };

  return e_t;
}
