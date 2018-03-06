'use strict';

var elasticsearch = require('elasticsearch');
var Promise = require('bluebird');

var log = console.log.bind(console);

var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});
const $idx = 'libcat'
const $type = 'doc'
const $has_multiple = '_hm'
const $part_of = '_po'
const $subentry_field = 'sub' //cf. subentry_arry and #01

// We need 84 for regular entries of higher tier writings (übergeordnete Werke),
// so let's use the last slot of 84 (the 9th) for the join.
const $join_field = '849'

function dropIndex() {
    return client.indices.delete({
        index: $idx,
    });
}

function createIndex() {
    let body = {
        settings: {
            number_of_shards: 1,
            "mapping.single_type": true
        },
        mappings: {
            "doc": { // single_type we use
                "properties": { },
            }
        }
    }

    // $has_multiple cannot be supplied as object property in above notation
    body.mappings.doc.properties[$join_field] = {
        "type": "join",
        relations: {}
    }

    body.mappings.doc.properties[$join_field].relations[$has_multiple] = $part_of 

    body.mappings.doc.properties[$subentry_field] = {
        type: "nested"
    }

    return client.indices.create({
        index: $idx,
        body: body
    });
}

function addToIndexParent() {
    let body = {
        // '#00': 'dw000002',
        '20': 'Reassessing reform : a historical investigation into church renewal',
        '30': 'Tr 21 * yb: Dauerleihgabe der Universität Trier',
        '31': 'Katholische Kirche ; Kirchliche Erneuerung ; Geschichte ; Kongress ; Gettysburg, Pa. <2008>',
        '37': 'eng',
        '39': 'edited by Christopher M. Bellitto and David Zachariah Flanagin',
        '41': 'Bellitto, Christopher M.',
        '412': 'Flanagin, David Zachariah',
        '74': 'Washington, D. C.',
        '75': 'Catholic University of America Press',
        '76': '2012',
        '77': 'XII, 289 S.',
        '83': 'Gettysburg 2008',
        '87': '978-0-8132-1999-8*',
        '8e': 'http://swbplus.bsz-bw.de/bsz380377365inh.htm = Inhaltsverzeichnis',
        '90': 'Tr 21 * yb 113',
        '96a': 'prov.',
        '96c': 'Brö',
        '99e': '20151210/14:45:50-25/2▼obroesch',
        '99m': 'LOC',
        '99n': '20150311/17:59:27'
    }

    body[$join_field] = $has_multiple

    return client.index({
        index: $idx,
        type: $type,
        id: '1',
        body: body
    });
}
function addToIndexChild() {
    let body = {
        // '#00': 'dw000002',
        '20': 'hello my child'
    }
    body[$join_field] = {
        name: $part_of,
        parent: '1'
    }
    return client.index({
        index: $idx,
        type: $type,
        id: '2',
        routing: '1',
        body: body 
    });
}


function search() {
    return client.search({
        index: $idx,
        q: 'reass*'
    }).then(log);
}

function closeConnection() {
    client.close();
}

function getFromIndex() {
    return client.get({
        id: 1,
        index: $idx,
        type: $type,
    }).then(log);

}

function waitForIndexing() {
    log('Wait for indexing ....');
    return new Promise(function(resolve) {
        setTimeout(resolve, 2000);
    });
}

Promise.resolve()
    .then(dropIndex)
    .then(createIndex)
    // .then(addToIndexParent)
    // .then(addToIndexChild)
    // .then(getFromIndex)
    // .then(waitForIndexing)
    // .then(search)
    .then(closeConnection);