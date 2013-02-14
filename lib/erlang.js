var util = require('util')
  , clone = require('clone');


function Erlang(user_input){

  var state = {}
  user_input.forEach(function(el){
    state[el.from] = clone(el);
  });

  this.state =state;

  this.op = ['+', '-', '*', '/', ',', '(', ')'];
  
}


/**
 * expand list of state variables names (id) (e.g prevalence def and
 * transmission tag "by" property)
 */

Erlang.prototype.expand_state_list = function(state_list){
  
  var that = this;

  var expanded = [];
  state_list.forEach(function(s){

    if(s in that.state){
      for(var i=0; i< that.state[s].shape; i++){
        var mys = s + '@' + i;
        expanded.push(mys);
      }
    } else {
      expanded.push(clone(s));    
    }  

  });

  return expanded;

}


/** 
 * Transform the rate into an array:
 *
 * example: 'r0*2*correct_rate(v)' ->
 * ['r0', '*', '2', 'correct_rate', '(', 'v', ')']
 */

Erlang.prototype.parse_rate = function (rate){

  rate = rate.replace(/\s+/g, '');

  var s = ''
    , l = [];
  
  for (var i = 0; i< rate.length; i++){
    if (this.op.indexOf(rate[i]) !== -1){
      if(s.length){
        l.push(s);
        s = '';
      }
      l.push(rate[i]);
    } else {
      s += rate[i];
    }
    
  }

  if (s.length){
    l.push(s);
  }

  return l;
}


/** 
 * (1-alpha)*l*(1-s) -> (1-alpha)*(l*3)*(1-s)
 */

Erlang.prototype.rescale = function(rate, erlang_state){

  var l = this.parse_rate(rate);

  var target = this.state[erlang_state].rescale
    , shape = this.state[erlang_state].shape;
  
  //replace every occurrence of target by target*shape
  l.forEach(function(x, i){
    if(x === target)      
      l[i] = util.format("(%s*%d)", x, shape);
  });

  return l.join('');
}


/** 
 * beta*S*I -> beta*S*(I@0+I@1)
 */

Erlang.prototype.expand_state_in_rate = function(rate){

  var that = this;

  var l = this.parse_rate(rate);

  l.forEach(function(s, i){
    if(s in that.state){
      e_s = [];
      for(var j = 0; j< that.state[s].shape; j++){
        e_s.push(s+ '@' + j);
      }

      l[i] = util.format("(%s)", e_s.join('+'));
    }
  });

  return l.join('');  
}


module.exports = Erlang;
