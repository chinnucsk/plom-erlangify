var util = require('util')
  , clone = require('clone');


function Erlanger(user_input){

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

Erlanger.prototype.expand_state_list = function(state_list){
  
  var that = this;

  var expanded = [];
  state_list.forEach(function(s){

    if(s in that.state){
      for(var i=0; i< that.state[s].shape; i++){
        var mys = s + '_' + i;
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

Erlanger.prototype.parse_rate = function (rate){

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

Erlanger.prototype.rescale = function(rate, erlang_state){

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
 * beta*S*I -> beta*S*(I_0+I_1)
 */

Erlanger.prototype.expand_state_in_rate = function(rate){

  var that = this;

  var l = this.parse_rate(rate);

  l.forEach(function(s, i){
    if(s in that.state){
      e_s = [];
      for(var j = 0; j< that.state[s].shape; j++){
        e_s.push(s+ '_' + j);
      }

      l[i] = util.format("(%s)", e_s.join('+'));
    }
  });

  return l.join('');  
}



/**
 * Note this function returns an array as one reaction can result in
 * several during erlangification
 */
Erlanger.prototype.erlangify_reaction = function(r) {

  var e_reactions, e_r, e_obj, e_within;

  var erlangified = []; //the list of erlangified reactions

  if(r.from in this.state){
    e_obj = this.state[r.from];

    if(r.to !== 'U') {
      e_r = clone(r);
      e_r.from += '_' + (e_obj.shape-1);
      e_r.to = (r.to in this.state) ? r.to + '_0' : r.to;

      if('rate' in e_r){
        e_r.rate = this.rescale(e_r.rate, r.from);
        e_r.rate = this.expand_state_in_rate(e_r.rate);
        if(('tag' in r) && ('transmission' in r.tag)){
          e_r.tag.transmission.by = this.expand_state_list(e_r.tag.transmission.by);
        }
      }

      erlangified.push(e_r);

    } else if (r.to === 'U') {

      for(var i = 0; i< e_obj.shape; i++){
        e_r = clone(r);
        e_r.from += '_' + i;
        if('rate' in e_r){
          e_r.rate = this.rescale(e_r.rate, r.from);
          e_r.rate = this.expand_state_in_rate(e_r.rate);
        }
        erlangified.push(e_r);
      }

    }

  } else if(r.to in this.state) { //we know that r.from is not erlang
    
    e_r = clone(r);
    e_r.to += '_0';
    if('rate' in e_r){
      e_r.rate = this.expand_state_in_rate(e_r.rate);
    }
    erlangified.push(e_r);

  } else {

    e_r = clone(r);    
    if('rate' in e_r){
      e_r.rate = this.expand_state_in_rate(e_r.rate);
    }
    erlangified.push(e_r);    
  }

  return erlangified;
};


module.exports = Erlanger;
