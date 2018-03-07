const patch = require('patch-module')

module.exports =
    patch('./node_modules/feathers-elasticsearch/lib/index.js'
        , undefined
        , [
            {find: 'parent,', replace: '[service.parent]: parent,'},
            // {find: 'let { query } = filter(params.query, this.paginate);\n', replace: 'let { query } = filter(params.query, this.paginate);\n debugger\n'},
            {find: 'parent: query[this.parent]', replace: '[data.routing ? "routing" : "parent"]: data.routing ? data.routing : query[this.parent]'}
            ,{find: 'body: removeProps(data, this.meta, this.id)', replace: 'body: removeProps(data, this.meta, this.id, "routing", "parent")'}
        ])
