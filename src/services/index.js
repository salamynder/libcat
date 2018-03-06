const elasticsearch = require('elasticsearch');
const service = require('feathers-elasticsearch');

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
    app.use('/libcat', service({
        Model: new elasticsearch.Client({
            host: 'localhost:9200'
            // , apiVersion: '5.0'
        }),
        // parent: 'parent', // _parent by default, but only 'parent' seems to work, but then it complains about missing routing param.... :(
        elasticsearch: {
            index: 'libcat',
            type: 'doc'
        }
    }));

};
