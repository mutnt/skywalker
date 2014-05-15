var Info = require('./info')
,	define = require('./define')
;

FileToString = function(){
	return this[File.safeKey].toString();
}

var File = function(filename){
	if(!(this instanceof File)){return new File(filename);}
	define
		(this,File.propertiesPropertyKey,(new Info(filename,this)))
		(this,File.safeKey,(new Info(filename,this)))
		(this,'toString',FileToString);
}
File.safeKey = '__________'
File.propertiesPropertyKey = '_';

module.exports = File;