# stream-concat-files
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]

Concatenates a bunch of files into one new file (or into any writable stream you provide).

## Usage

`$ npm install stream-concat-files`

```javascript
var concatFiles = require('stream-concat-files');

// Concatenate them into a file
concatFiles(['a.txt', 'b.txt', 'c.txt'], 'concat.txt', function (err) {
  if (err) throw err;

  // concat.txt is now saved
});

// Or concatenate them into an existing write stream, and don't end it
concatFiles(['a.txt', 'b.txt'], someWritableStream, {end: false}, function (err) {
  if (err) throw err;
  
  // someWritableStream has now been written to (but not ended)
});
```

## Options

You can optionally pass in an options object just before the callback.

- **`end`** – whether to end the write stream after the last file has been piped into it (default: `true`)

## Contributing

- run `mocha --watch` while you're working
- improvements welcome

## License
Copyright (c) 2014 . Licensed under the MIT license.



[npm-url]: https://npmjs.org/package/stream-concat-files
[npm-image]: https://badge.fury.io/js/stream-concat-files.png

[travis-url]: http://travis-ci.org/callumlocke/stream-concat-files
[travis-image]: https://secure.travis-ci.org/callumlocke/stream-concat-files.png?branch=master
