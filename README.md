# Skywalker

Walks a directory or a file and optionally applies transformations on its nodes by using regex.
There are other modules that do the same, I didn't like them, rolled my own.

Can't believe skywalker was not already in use on npmjs.

### Usage

```js
	var tree = require('skywalker');
	tree('./somepath')
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
```
