var Erlanger = require('./lib/erlanger')
  , erlangify_process = require('./lib/erlangify_process')
  , erlangify_link = require('./lib/erlangify_link')
  , erlangify_theta = require('./lib/erlangify_theta');

function Erlang(def) {
  this.erlanger = new Erlanger(def); 
}

Erlang.prototype.ify = function(component) {

  //get the  the component type
  var ctype;
  if('frequency' in component){
    ctype = 'context';
  } else if('state' in component){
    ctype = 'process';
  } else if('observed' in component){
    ctype = 'link';
  } else if('cmd' in component){
    ctype = 'design';
  } else {
    ctype = 'theta';
  }

  if(ctype === 'process'){
    return erlangify_process(this.erlanger, component);
  } else if (ctype === 'link'){
    return erlangify_link(this.erlanger, component);
  }  else if (ctype === 'theta'){
    return erlangify_theta(this.erlanger, component);
  } else {
    throw new Error('component cannot be Erlangified');
  }
 
}

module.exports = Erlang;

