var util = require('util')
  , Erlang = require('../');

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

  pop_size_eq_sum_sv: false,

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
      definition: [{from:'E', to:'I'}], 
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

var t = {

  value: {
    E: {
      partition_id: 'variable_population', transformation: 'logit',
      min:   {'city1__all': 0.07, 'city2__all': 0.07},
      guess: {'city1__all': 0.07, 'city2__all': 0.07},
      max:   {'city1__all': 0.07,  'city2__all': 0.07},
      sd_transf:   {'city1__all': 0.0,  'city2__all': 0.0}
    },

    I: {
      partition_id: 'identical_population', transformation:'logit',
      min: 1e-6, guess: 1e-05, max: 1e-4, sd_transf: 0.01
    },

    v: {
      partition_id: 'identical_population', transformation: 'log', unit: 'D', type: 'rate_as_duration',
      min: 5, guess: 11, max: 20,
      sd_transf: 0.02
    }
  }
};


var def = [
  {from: 'E', to: 'E', rate: '(1-alpha)*l', shape: 3, rescale: 'l'}, //note that the rate do *not* contains "s", the split into A or I occurs after the Erlang expansion
  {from: 'I', to: 'I', rate: '(1-alpha)*v', shape: 2, rescale: 'v'} //also we need the "rescale" property to multiply the argument (x) of "rescale" by "shape" in the other reactions whom rates can be different from the one specified here
];


var erlang = new Erlang(def);

var e_p = erlang.ify(p);
console.log(util.inspect(e_p, false, null));

var e_l = erlang.ify(l);
console.log(util.inspect(e_l, false, null));

var e_t = erlang.ify(t);
console.log(util.inspect(e_t, false, null));

