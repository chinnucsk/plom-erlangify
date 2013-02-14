var _ = require('underscore')
  , clone = require('clone');

var p = {
  state: [{id:'S'}, {id:'E', comment: 'exposed'}, {id:'I'}],
  parameter: [{id:'r0'}, {id:'v'}, {id:'l'}, {id:'sto'}, {id:'alpha'}, {id:'mu_b'}, {id:'mu_d'}, {id:'vol'}, {id:'g'}],

  model: [
    {from: 'U',  to: 'S',  rate: 'mu_b*N'},
    {from: 'DU', to: 'S',  rate: 'g*(N-S-I)'},

    {from: 'S',  to: 'E',  rate: 'r_0/N*v*I', tag: {transmission:{by: ["I"]}}},

    {from: 'E',  to: 'U',  rate: 'alpha*l + mu_d'},      
    {from: 'E',  to: 'I',  rate: '(1-alpha)*l'},

    {from: 'I',  to: 'U',  rate: 'alpha*v + mu_d'},
    {from: 'I',  to: 'DU', rate: '(1-alpha)*v'},

    {from: 'S',  to: 'U',  rate: 'mu_d'}
  ],

  white_noise: [
    {
      reaction: [{"from":"S", "to": "E"}],
      sd: "sto"
    }
  ],

  pop_size_eq_sum_sv: false
};

var l = {
  observed: [
    {
      id: "prev",
      definition: ["I"],
      model_id: "common"
    },
    {
      id: "SI",
      definition: ["S", "I"], 
      model_id: "common"
    },
    {
      id: "inc_out",  
      definition: [{from:"I", to:"DU"}, {from:"I", to:"U"}],
      model_id: "common"
    },
    {
      id: "inc_in",   
      definition: [{from:"S", to:"E"}], 
      model_id: "common"
    }
  ]
};


var user_input = [
  {state: 'I', rate: 'v', shape: 3}, //note that the rate is v and **not** (1-alpha)*v
  {state: 'E', rate: 'l', shape: 2}
];



/**
 * From user input to an object with states as key
 */

var erlang = {};

user_input.forEach(function(el){
  erlang[el.state] = {};
  for(var p in el){
    if (p !== 'state') {
      erlang[el.state][p] = el[p];
    }
  }
});


/**
 * expand state variables objects
 */

function expand_pstate(state){

  var expanded = [];
  state.forEach(function(s){

    if(s.id in erlang){
      for(var i=0; i< erlang[s.id].shape; i++){
        var mys = clone(s);
        mys.id = s.id + '@' + i;
        if(mys.comment){
          mys.comment +=  ' (Erlang expanded)'
        }

        expanded.push(mys);
      }
    } else {
      expanded.push(clone(s));    
    }  

  });

  return expanded;
}

console.log(expand_pstate(p.state));


/**
 * expand list of state variables names (id) (e.g prevalence def and
 * transmission tag "by" property)
 */

function expand_state_list(state_list){

  var expanded = [];
  state_list.forEach(function(s){

    if(s in erlang){
      for(var i=0; i< erlang[s].shape; i++){
        var mys = s + '@' + i;
        expanded.push(mys);
      }
    } else {
      expanded.push(clone(s));    
    }  

  });

  return expanded;
}

console.log(expand_state_list(["E", "I"]));

/** 
 * Transform the rate into an array:
 *
 * example: 'r0*2*correct_rate(v)' ->
 * ['r0', '*', '2', 'correct_rate', '(', 'v', ')']
 */

var op = ['+', '-', '*', '/', ',', '(', ')'];

function parse_rate(rate){

  rate = rate.replace(/\s+/g, '');

  var s = ''
    , l = [];
  
  for (var i = 0; i< rate.length; i++){
    if (op.indexOf(rate[i]) !== -1){
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


console.log(parse_rate('(1 - alpha) * l'));


