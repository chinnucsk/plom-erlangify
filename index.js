var _ = require('underscore')
  , util = require('util')
  , clone = require('clone')
  , Erlang = require('./lib/erlang');

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
 * Note this function returns an array as one reaction can result in
 * several during erlangification
 */
function erlangify_reaction(erlang, r) {

  var e_reactions, e_r, e_obj, e_within;

  var erlangified = []; //the list of erlangified reactions

  if(r.from in erlang.state){
    e_obj = erlang.state[r.from];

    if(r.to !== 'U') {
      e_r = clone(r);
      e_r.from += '@' + (e_obj.shape-1);
      e_r.to = (r.to in erlang.state) ? r.to + '@0' : r.to;
      e_r.rate = erlang.rescale(e_r.rate, r.from);
      
      if(('tag' in r) && ('transmission' in r.tag)){
        e_r.tag.transmission.by = erlang.expand_state_list(e_r.tag.transmission.by);
      }

      e_r.rate = erlang.expand_state_in_rate(e_r.rate);
      erlangified.push(e_r);

    } else if (r.to === 'U') {

      for(var i = 0; i< e_obj.shape; i++){
        e_r = clone(r);
        e_r.from += '@' + i;
        e_r.rate = erlang.rescale(e_r.rate, r.from);
        e_r.rate = erlang.expand_state_in_rate(e_r.rate);
        erlangified.push(e_r);
      }

    }

  } else if(r.to in erlang.state) { //we know that r.from is not erlang
    
    e_r = clone(r);
    e_r.to += '@0';
    e_r.rate = erlang.expand_state_in_rate(e_r.rate);
    erlangified.push(e_r);

  } else {

    e_r = clone(r);    
    e_r.rate = erlang.expand_state_in_rate(e_r.rate);
    erlangified.push(e_r);    

  }

  return erlangified;
};


function within_state_reactions(erlang){

  //Within compartment expansion E@0->E@1, E@1->E@2, ...
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




var erlang = new Erlang(user_input);

console.log(erlangify_pstate(erlang, p.state));

var e_pmodel = []; //the expanded process model
p.model.forEach(function(r){  
  e_pmodel = e_pmodel.concat(erlangify_reaction(erlang, r));
});

e_pmodel = e_pmodel.concat(within_state_reactions(erlang));

console.log(e_pmodel);
