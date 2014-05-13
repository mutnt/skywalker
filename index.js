var fs = require('fs')
,	path = require('path')
,	events = require('events')
,	EventEmitter = events.EventEmitter
,	extend = require('node.extend')
,	util = require('util')
,	inspect = function(){
		var args = Array.prototype.slice.call(arguments);
		if(!args.length){args = ['----------------'];}
		var options = {showHidden:false,depth:4,colors:true};
		for(var i = 0; i<args.length;i++){
			args[i] = util.inspect(args[i],options);
		}
		console.log.apply(console,args);
	}
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
,	ERROR: 'error'
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
	this._emitError = false;
}
util.inherits(Tree, EventEmitter);
Tree.prototype.start = function Start(callback){
	var that = this;
	this.process(this.filename,function(err,file){
		if(err){
			console.log('error')
			if(that._emitError){that.emit(events.ERROR,err);}
			if(callback){callback(err);}
			return;
		};
		that.emit(events.DONE,file);
		if(callback){callback(null,file);}
	});
	return this;
}
Tree.prototype.emitError = function EmitError(doEmit){
	if(arguments.length){this._emitError = doEmit;}
	return this;
}
Tree.prototype.process = function Process(filename,cb){
	var file = new File(filename);
	var that = this;
	fs.lstat(file._.path,function(err,stats){
		if(err){return cb(err);}
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
Tree.prototype.processDir = function ProcessDir(file,cb){
	var _path = file._.path;
	var that = this;
	fs.readdir(_path,function(err,files){
		if(err){return cb(err);}
		var i = 0
		,	l = files.length
		,	total = l
		,	f
		,	interrupt = false
		,	error = function(err){
				interrupt = true;
				total = 0;
				cb(err);
			}
		,	done = function Done(err,child){
				if(interrupt){return;}
				if(err){return error(err);}
				if(child){
					try{
						file._.add(child._.name,child);
						child._.parent.push(file._.path);
					}catch(e){return error(err);}
				}
				total--;
				if(total<=0){
					that.processFilters(file,cb);
				}
			}
		;

		if(!total){done();}
		for(i;i<total;i++){
			f = files[i];
			that.process(_path+'/'+f,done)
		}
	})
	return this;
}
Tree.prototype.processFile = function ProcessFile(file,cb){
	this.processFilters(file,cb);
	return this;
}
Tree.prototype.filter = function Filter(regex,func,type){
	var that = this;
	type = 
		(type && type.match(/f|file/i))? types.FILE :
		(type && type.match(/d|dir|directory|folder/i))? types.DIRECTORY :
		false
	var fn = function Filter(file,next,done){
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
Tree.prototype.directoryFilter = function DirectoryFilter(regex,func){
	return this.filter(regex,func,types.DIRECTORY)
}
Tree.prototype.fileFilter = function FileFilter(regex,func){
	return this.filter(regex,func,types.FILE)
}
Tree.prototype.extensionFilter = function ExtensionFilter(ext,func,type){
	ext = new RegExp('\.'+ext+'$','i');
	type = type || types.FILE;
	return this.filter(ext,func,type)
}
Tree.prototype.processFilters = function ProcessFilters(file,callback){
	var i = 0
	,	filters = this.filters
	,	l = filters.length
	,	that = this
	,	isDone = false
	,	interrupt = false
	,	error = function(err){
			interrupt = true;
			isDone = true;
			callback(err);
		}
	,	done = function Done(err,replace){
			if(interrupt){return;}
			if(err){error(err);}
			if(arguments.length>1){file = replace;}
			if(!isDone){
				isDone = true;
				callback(null,file);
			}
		}
	,	next = function Next(){
			if(interrupt){return;}
			if(i==l){
				return done();
			}
			filters[i++].call(that,file,next,done);
		}
	;
	next();
	return this;
}
Tree.events = events;

module.exports = Tree;

/** /
	Tree('../puppeteer/sites')
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
			done(null,false);
		})
		.filter(/^(.*?)$/g,function(matches,next,done){
			var _path = this._.path;
			if(_path.match(/error/)){
				done(new Error('this is an error'));	
			}else{next()};
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
		.on('file',function(file){console.log('file event:',file._.path);})
		.on('directory',function(file){console.log('directory event:',file._.path);})
		.on('done',function(file){console.log('-----------------------');})
		.on('error',function(err){console.log('ERROR',err);})
		.start(function(err,file){
			if(err){return inspect(err);}
			inspect(file);
		})
/**/