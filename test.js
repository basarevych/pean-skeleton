
var massive = require('massive');

massive.connect({ connectionString: 'postgresql://pean:pean@localhost/pean' }, function (err, db) {
    if (err)
        process.exit(1);

    console.log('done');
});
