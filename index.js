var _ = require('underscore')
  , util = require('util')
  , clone = require('clone');

var p = {

  state: [
    {id:'S'},
    {id:'E', comment: 'exposed'},
    {id:'I', comment: 'symptomatic infectious'}, 
    {id:'A', comment: 'asymptomatic infectious'}
  ],

  parameter: [
    {id:'r0', comment: 'basic reproductive number'},
    {id:'v', comment: 'recovery rate'},
    {id:'l', comment: 'latency rate'},
    {id:'sto'},
    {id:'alpha', comment: 'virulence'}, 
    {id:'s', comment: 'proportion of symptomatic'}, 
    {id:'mu_b'}, 
    {id:'mu_d'}, 
    {id:'g', comment: 'waning immunity rate'}
  ],

  model: [
    {from: 'U',  to: 'S',  rate: 'mu_b*N'},
    {from: 'DU', to: 'S',  rate: 'g*(N-S-I)'},

    {from: 'S',  to: 'E',  rate: 'r0/N*v*(I+A)', tag: {transmission:{by: ["I"]}}},

    {from: 'E',  to: 'U',  rate: 'alpha*l', comment: "disease induced mortality (virulence)"},
    {from: 'E',  to: 'I',  rate: '(1-alpha)*l*s'},
    {from: 'E',  to: 'A',  rate: '(1-alpha)*l*(1-s)'},

    {from: 'I',  to: 'U',  rate: 'alpha*v'},
    {from: 'I',  to: 'DU', rate: '(1-alpha)*v'},
    {from: 'A',  to: 'DU', rate: 'v'},

    {from: 'S',  to: 'U',  rate: 'mu_d'},
    {from: 'E',  to: 'U',  rate: 'mu_d'},
    {from: 'I',  to: 'U',  rate: 'mu_d'},
    {from: 'A',  to: 'U',  rate: 'mu_d'},
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
      id: 'prev',
      definition: ['I'],
      model_id: 'common'
    },
    {
      id: 'inc_out_E',
      definition: {from:'E', to:'I'}, 
      model_id: 'common'
    },
    {
      id: 'inc_out',  
      definition: [{from:'I', to:'U', rate: 'alpha*v'}],
      model_id: 'common'
    },
    {
      id: 'inc_in',   
      definition: [{from:'S', to:'E'}], 
      model_id: 'common'
    }
  ]
};


var user_input = [
  {from: 'E', to: 'E', rate: '(1-alpha)*l', shape: 3, rescale: 'l'}, //note that the rate do *not* contains "s", the split into A or I occurs after the Erlang expansion
  {from: 'I', to: 'I', rate: '(1-alpha)*v', shape: 2, rescale: 'v'} //also we need the "rescale" property to multiply the argument (x) of "rescale" by "shape" in the other reactions whom rates can be different from the one specified here
];


/**
 * From user input as an array to an object with from as key
 */

var erlang = {};

user_input.forEach(function(el){
  erlang[el.from] = clone(el);
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

function multiply_by_shape(rate, target, shape){

  var l = parse_rate(rate);
  
  //replace every occurrence of target by target*shape
  l.forEach(function(x, i){
    if(x === target)      
      l[i] = util.format("(%s*%d)", x, shape);
  });

  return l.join('');
}


function expand_state_in_rate(rate){

  var l = parse_rate(rate);

  l.forEach(function(s, i){
    if(s in erlang){
      e_s = [];
      for(var j = 0; j< erlang[s].shape; j++){
        e_s.push(s+ '@' + j);
      }

      l[i] = util.format("(%s)", e_s.join('+'));
    }
  });

  return l.join('');  
}



var e_pmodel = []; //the expanded process model
p.model.forEach(function(r){

  var parsed_rate, e_reactions, e_r, e_obj, e_within;

  if(r.from in erlang){
    e_obj = erlang[r.from];

    if(r.to !== 'U') {
      e_r = clone(r);
      e_r.from += '@' + (e_obj.shape-1);
      e_r.to = (r.to in erlang) ? r.to + '@0' : r.to;
      e_r.rate = multiply_by_shape(e_r.rate, e_obj['rescale'], e_obj.shape);
      
      if(('tag' in r) && ('transmission' in r.tag)){
        e_r.tag.transmission.by = expand_state_list(e_r.tag.transmission.by);
      }

      e_r.rate = expand_state_in_rate(e_r.rate);
      e_pmodel.push(e_r);

    } else if (r.to === 'U') {

      for(var i = 0; i< e_obj.shape; i++){
        e_r = clone(r);
        e_r.from += '@' + i;
        e_r.rate = multiply_by_shape(e_r.rate, e_obj['rescale'], e_obj.shape);
        e_r.rate = expand_state_in_rate(e_r.rate);
        e_pmodel.push(e_r);
      }

    }

  } else if(r.to in erlang) { //we know that r.from is not erlang
    e_obj = erlang[r.to];
    
    e_r = clone(r);
    e_r.to += '@0';
    e_r.rate = expand_state_in_rate(e_r.rate);
    e_pmodel.push(e_r);

  } else {
    e_r = clone(r);    
    e_r.rate = expand_state_in_rate(e_r.rate);
    e_pmodel.push(e_r);    
  }

});

console.log(e_pmodel);


//Within compartment expansion E@0->E@1, E@1->E@2, ...
var e_reactions;
for(var s in erlang){
  e_reactions = [];
  for(var i = 0; i< erlang[s].shape-1; i++){
    e_reactions.push({
      from: s + '@' + i,
      to: s + '@' + (i+1),
      rate: expand_state_in_rate(multiply_by_shape(erlang[s].rate, erlang[s]['rescale'], erlang[s]['shape']))
    });
  }

  console.log(e_reactions);
}


