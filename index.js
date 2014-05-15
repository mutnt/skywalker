var Tree = module.exports = require('./lib/Tree');

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