var mime = require('mime');

var Mime = function(file){
	this.set(file);
}
Mime.prototype.toString = function(){
	return this.mimeType;
}
Mime.prototype.set = function(file){
	var mimeType = mime.lookup(file);
	var m = mimeType.split('/');
	this.type = m.shift();
	this.subtype = m.shift();
	this.mimeType = mimeType;	
}

module.exports = Mime;