var fs = require('fs')
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
,	File = require('./file')
,	safeKey = File.safeKey
;

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
Tree.prototype.file = function(filename){
	if(filename){this.filename = filename; return this;}
	return this.filename;
}
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
	fs.lstat(file[safeKey].path,function(err,stats){
		if(err){return cb(err);}
		if(stats.isDirectory()){
			file[safeKey].type = types.DIRECTORY;
			file[safeKey].isDirectory = true;
			file[safeKey].mime.set('directory/inode');
			that.emit(events.DIRECTORY,file);
			return that.processDir(file,cb);
		}
		file[safeKey].type = types.FILE;
		that.emit(events.FILE,file);
		return that.processFile(file,cb);
	})
	return this;
}
Tree.prototype.processDir = function ProcessDir(file,cb){
	var _path = file[safeKey].path;
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
						file[safeKey].add(child[safeKey].name,child);
						child[safeKey].parents.push(file[safeKey].path);
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
		var _path = file[safeKey].path;
		var _type = file[safeKey].type;
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
Tree.propertiesPropertyKey = function(key){
	if(key){File.propertiesPropertyKey = key; return Tree;}
	return File.propertiesPropertyKey;
}
module.exports = Tree;
