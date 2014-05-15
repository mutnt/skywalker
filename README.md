# Skywalker

Walks a directory or a file and optionally applies transformations on its nodes by using regex.
There are other modules that do the same, I didn't like them, rolled my own.

Can't believe skywalker was not already in use on npmjs.

### Usage

```js
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
```

If you want to set the filename later (not at instanciation), do that:

```js
	Tree()
		.file('path_to_file')
		//other things
		.start(callback)

```

By default, skywalker does not emit errors so you do not have to handle errors both in the callback and the event;
However, if you prefer event-style, do the following:

```js
	tree
	.emitError(true)
	.on('error',function(err){
		console.log('error',err);
	})
```

All properties (name, path, etc) are stored on a property named "_".
The following properties are to be found:

```js
	file._.path //full path to the file
	file._.dirname //parent dir of the file
	file._.filename //filename of the file, including extension
	file._.extension //extension, without the dot
	file._.name //filename without extension
	file._.children //an array of children for directories, in case you prefer looping arrays
	file._.parents //an array of parents (backref to the parents)
	file._.contents  //empty, fill it with a string if in your own callbacks
	file._.mime //mimetype, for example 'text/plain'
	file._.mime.type //for example 'text'
	file._.mime.subType //for example, 'plain'
```

If you have, in your path, a file or folder named "_", then the properties will be overwritten.
In that case, you have two options:
1 - Change the default namespace:
```js
	Tree.propertiesPropertyKey('_somethingsafe_');
	// later...
	console.log(file._somethingsafe_.path)
```
2 - use the safe namespace:
```js
	console.log(file.__________.path); //yes, that's 10 "_". If you have a file named like that too, then you are shit out of luck.
```
The default toString() function outputs the file's path, but if you set content to the file:

```js
	file._.contents = 'abcde';
```

Then this is what toString will output.


To detect mimetypes, skywalker uses [node-mime](https://github.com/broofa/node-mime). It is made available on the 

```js
	Tree.mime
	//define a new mime-type:
	Tree.mime.define({
		'text/jade':['jade']
	})
```
namespace.