const elasticsearch = require('elasticsearch');
// const service = require('feathers-elasticsearch');
const service = require('./patch-feathers-elastic');

const my_es = service({
    Model: new elasticsearch.Client({
        host: 'localhost:9200'
        // , apiVersion: '5.0'
    }),
    parent: 'routing', // _parent by default, but only 'parent' seems to work, but then it complains about missing routing param.... :(
    elasticsearch: {
        index: 'libcat',
        type: 'doc'
    }
})
const {gvk_ppn} = require('./gvk-request')

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
    app.use('/libcat', my_es);
    app.get('/gvk_ppn/:ppn', gvk_ppn)

};
