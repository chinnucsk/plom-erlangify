plom-erlangify
==============

Erlangify your PLoM JSON components (process, link and theta).


installation
============

    npm install plom-erlangify

usage
=====

    var Erlang = require('plom-erlangify');
    
    //get some model components
    var p = require('./test/process.json')
      , l = require('./test/link.json')
      , t = require('./test/theta.json');
    
    //Definition of the Erlang expansion
    var def = [
      {from: 'E', to: 'E', rate: '(1-alpha)*l', shape: 3, rescale: 'l'},
      {from: 'I', to: 'I', rate: '(1-alpha)*v', shape: 2, rescale: 'v'}
    ];
    
    //erlangify !    
    var erlang = new Erlang(def);
    
    var e_p = erlang.ify(p)
      , e_l = erlang.ify(l)
      , e_t = erlang.ify(t);      

test
====

see ```test/index.js```


License
=======

GPL version 3 or any later version.
