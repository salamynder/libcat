const patch = require('patch-module')

module.exports =
    patch('./node_modules/feathers-elasticsearch/lib/index.js'
        , undefined
        , [{find: 'parent,', replace: '[service.parent]: parent,'}])
