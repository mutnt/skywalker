var fs = require('fs')
,	path = require('path')
,	extend = require('node.extend')
,	events = require('events')
,	EventEmitter = events.EventEmitter
,	util = require('util')
;
/**
var RegexEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};
RegexEscape.start = /^\//;
RegexEscape.end = /\/([gis]{1,3}?)$/;
var strToRegex = function(s){
	s = s.replace(RegexEscape.start,'');
	var m;
	if(m = s.match(RegexEscape.end)){
		m = m[1];
		s = s.replace(RegexEscape.end,'');
	}
	return new RegExp(s,m);
}	
*/
var Infoadd = function(name,obj){
	var file = this._file;
	this.children.push(obj);
	file[name] = obj;
}
var Info = function(filename,file){
	if(!(this instanceof Info)){return new Info(filename,file);}
	this.path = filename;
	this.filename = path.basename(filename);
	this.extension = path.extname(this.filename).replace('.','');
	this.name = path.basename(this.filename,'.'+this.extension);
	this.children = [];
	this.parent = [];
	Object.defineProperty(this,'_file',{value:file,writable:false,enumerable:false})
	Object.defineProperty(this,'add',{value:Infoadd,writable:false,enumerable:false})
}

var File = function(filename){
	if(!(this instanceof File)){return new File(filename);}
	var info = new Info(filename,this);
	Object.defineProperty(this,'_',{value:info,writable:false,enumerable:false})
}

var events = {
	FILE: 'file'
,	DIRECTORY: 'directory'
,	DONE: 'done'
}
var types = {
	FILE: 'file'
,	DIRECTORY: 'dir'
}
var Tree = function(filename){
	if(!(this instanceof Tree)){return new Tree(filename);}
	EventEmitter.call(this);
	this.filename = filename;
	this.filters = [];
}
util.inherits(Tree, EventEmitter);
Tree.prototype.start = function(callback){
	var that = this;
	this.process(this.filename,function(file){
		that.emit(events.DONE,file);
		if(callback){callback(file);}
	});
	return this;
}
Tree.prototype.process = function(filename,cb){
	var file = new File(filename);
	var that = this;
	fs.lstat(file._.path,function(err,stats){
		if(err){throw err;}
		if(stats.isDirectory()){
			file._.type = types.DIRECTORY;
			file._.isDirectory = true;
			that.emit(events.DIRECTORY,file);
			return that.processDir(file,cb);
		}
		file._.type = types.FILE;
		that.emit(events.FILE,file);
		return that.processFile(file,cb);
	})
	return this;
}
Tree.prototype.processDir = function(file,cb){
	var _path = file._.path;
	var that = this;
	fs.readdir(_path,function(err,files){
		if(err){throw err;}
		var i = 0
		,	l = files.length
		,	total = l
		,	f
		;
		var done = function(child){
			if(child){
				file._.add(child._.name,child);
				child._.parent.push(file._.path);
			}
			total--;
			if(total==0){
				that.processFilters(file,cb);
			}
		}
		for(i;i<total;i++){
			f = files[i];
			that.process(file._.path+'/'+f,done)
		}
	})
	return this;
}
Tree.prototype.processFile = function(file,cb){
	this.processFilters(file,cb);
	return this;
}
Tree.prototype.filter = function(regex,func,type){
	var that = this;
	type = 
		(type && type.match(/f|file/i))? types.FILE :
		(type && type.match(/d|dir|directory|folder/i))? types.DIRECTORY :
		false
	var fn = function(file,next,done){
		var _path = file._.path;
		var _type = file._.type;
		var m = _path.match(regex);
		if((!type || type == _type) && m){
			func.call(file,m,next,done);
		}
		else{next();}
	}
	this.filters.push(fn);
	return this;
}
Tree.prototype.directoryFilter = function(regex,func){
	return this.filter(regex,func,types.DIRECTORY)
}
Tree.prototype.fileFilter = function(regex,func){
	return this.filter(regex,func,types.FILE)
}
Tree.prototype.extensionFilter = function(ext,func,type){
	ext = new RegExp('\.'+ext+'$','i');
	type = type || types.FILE;
	return this.filter(ext,func,type)
}
Tree.prototype.processFilters = function(file,callback){
	var i = 0
	,	filters = this.filters
	,	l = filters.length
	,	that = this
	,	isDone = false
	,	done = function(replace){
			if(arguments.length){file = replace;}
			if(!isDone){
				isDone = true;
				callback(file);
			}
		}
	,	next = function(){
			if(i==l){
				return callback(file);
			}
			filters[i++].call(that,file,next,done);
		}
	;
	next();
	return this;
}
Tree.events = events;

module.exports = Tree;

/**
	Tree('../sites')
		.filter(/something/g,function(matches,next,done){
			console.log('runs for all files or directories that match "something"',this._.path);
			next()
		})
		.directoryFilter(/something/g,function(matches,next,done){
			console.log('runs for all directories that match "something"',this._.children.length);
			next();
		})
		.fileFilter(/something/g,function(matches,next,done){
			console.log('runs for all files that match "something"',this._.path);
			next();
		})
		.fileFilter(/something/g,function(matches,next,done){
			console.log('runs for all files that match "something"',this._.path);
			next();
		})
		.filter(/(^|\/)_.*?$/g,function(matches,next,done){
			console.log('rejects all files or directories that begin with "_"',this._.path);
			done(false);
		})
		.extensionFilter('json',function(matches,next,done){
			console.log('runs for all files that have a json extension',this._.path);
			var file = this;
			require('fs').readFile(this._.path,'utf8',function(err,contents){
				if(err){
					file._.error = err;
					return next();
				}
				try{
					file.contents = JSON.parse(contents);
				}catch(err){
					file._.error = err;
				}
				next();
			})
		})
		.on('file',function(file){
			console.log('file event:',file._.path);
		})
		.on('directory',function(file){
			console.log('directory event:',file._.path);
		})
		.on('done',function(file){
			console.log('-----------------------');
		})
		.start(function(file){
			console.log(require('util').inspect(file, {showHidden:false,depth:4,colors:true}));
		})
**/