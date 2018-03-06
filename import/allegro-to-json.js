const lc = new require('chunking-streams').LineCounter()
const fs = require('fs')
const detect_eol = require('detect-newline')

const $idx = 'libcat'
const $type = 'doc'
const $has_multiple = '_hm'
const $part_of = '_po'
const $join_field = '849'
const $subentry_field = 'sub' //cf. subentry_array and #01

const $prettyPrintEntries = true // needs false for ES-bulk-import (ND-JSON)
// https://www.elastic.co/guide/en/elasticsearch/reference/6.1/docs-bulk.html

const $in = './output.adt'
const file = fs.readFileSync($in, 'utf8')
const eol = detect_eol(file)
const get_partOf_Ids = file 
    .split(eol)
    .filter(line => line.indexOf('#84 _') === 0)
    .map(line => line.slice(5))
    .filter((v, i, a) => a.indexOf(v) === i) // might be slow for bigger arrays!
    //https://stackoverflow.com/questions/1960473/get-all-unique-values-in-an-array-remove-duplicates#14438954

var inS = fs.createReadStream($in),
    coll = {}, // collection-object for the current obj
    bulkMeta = {
        index: {
            "_index" : $idx,
            "_type" : $type,
            "_id" : ""
        }
    },
    working_on_sub = false,
    // ^ will be toggled, if seeing #01 or end-of-record (\r\n)
    out = fs.createWriteStream('./for-elastic-import.json');

const regex = new RegExp('¶+'+eol, 'g')
lc.on('data', chunk => {
    let line = chunk.toString().replace(regex, eol) 
    if (line.startsWith("  ")) {
        // header record string
        return
    }
    if (line.startsWith(eol)) {
        // end of record -- get it out
        // console.log(JSON.stringify(bulkMeta))
        // console.log(JSON.stringify(coll, null, 4))
        out.write(JSON.stringify(bulkMeta))
        out.write('\n')
        $prettyPrintEntries
            ? out.write(JSON.stringify(coll, null, 4))
            : out.write(JSON.stringify(coll))
        out.write('\n')

        // clear the currentObj
        coll = {}
        // new record begins in next line, so reset this:
        working_on_sub = false
        // clear the routing value from the 84-capture
        delete bulkMeta.index.routing
        return
    }
    if (line) {
        // one of the entries #20,....
        // get #20 (the specific category), discard the #
        let cat = line.slice(1, 4).trimRight()
        // get the rest
        let desc= line.slice(4).trimRight()

        // add to obj
        switch (cat) {
        case '00':
            // for ES-bulk-insert (action is INDEXing), we need another object coming before the actual data object, like this
            // { "index" : { "_index" : "test", "_type" : "type1", "_id" : "1" } }
            // https://www.elastic.co/guide/en/elasticsearch/reference/6.1/docs-bulk.html
            bulkMeta.index._id = desc
            if (get_partOf_Ids.find(id => id === desc))
                coll[$join_field] = $has_multiple
            break;

        case '84':
            if (desc.startsWith('_'))
                coll[$join_field] = {
                    name: $part_of,
                    parent: desc.slice(1)
                } 
                // also put this ID in the bulkMeta.routing-prop
            bulkMeta.index.routing = desc.slice(1)
            break;

        case '01':
            // subentry
            // if(!coll[$subentry_field]) debugger
            if (!coll[$subentry_field]) coll[$subentry_field] = []
            coll[$subentry_field].push({'01': desc})
            // Do we have to keep track of the current idx in array of the
            // object we're working on? Yes, but implicitly: we always work on
            // the last object pushed into the array.
            working_on_sub = true

            break;

        default:
            if (!working_on_sub) coll[cat] = desc
            else {
                // As stated above, we're always working on the last object in the array.
                let lastObj_in_subEntryArray = coll[$subentry_field].length - 1
                // debugger
                coll[$subentry_field][lastObj_in_subEntryArray][cat] = desc
            }
        }



 
        return
    }
})

inS.pipe(lc)