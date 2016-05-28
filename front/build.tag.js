var fs = require('fs');
var path = require('path');

var string = "";
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
for (var i = 0; i < 64; i++ )
    string += chars.charAt(Math.floor(Math.random() * chars.length));

fs.writeFileSync(path.join(__dirname, 'build.tag.txt'), string + "\n");
