var define = module.exports = function(obj,name,val){
	Object.defineProperty(obj,name,{
		value:val
	,	writable:false
	,	enumerable:false
	});
	return define;
}
;