var path = require('path')
,	define = require('./define')
,	Mime = require('./mime')
;

var InfoMethods = {
	add: function(name,obj){
		var file = this._file;
		this.children.push(obj);
		file[name] = obj;
	}
,	toString: function(){
		return (this.contents || this.content || this.path)+'';
	}
};

var Info = function(filename,file){
	if(!(this instanceof Info)){return new Info(filename,file);}
	this.path = filename;
	this.dirname = path.dirname(filename);
	this.filename = path.basename(filename);
	this.extension = path.extname(this.filename).replace('.','');
	this.name = path.basename(this.filename,'.'+this.extension);
	this.children = [];
	this.parents = [];
	this.contents = '';
	this.mime = new Mime(filename);
	for(var n in InfoMethods){
		define(this,n,InfoMethods[n])
	}
	define(this,'_file',file);
}

module.exports = Info;