var m = require('mithril');
var stream = require('mithril/stream');
var fm = require('feathers-mithril');
var feathers = require('@feathersjs/client');
var feathersSocket = require('@feathersjs/socketio-client');
var io = require('socket.io-client');
var reactive = require('feathers-reactive');
var rxjs = require('rxjs/Rx');

var _reduce = require('lodash/reduce')
var _fromPairs = require('lodash/fromPairs')
var _toPairs = require('lodash/toPairs')
var _padEnd = require('lodash/padEnd')
var _omit = require('lodash/omit')

var dUrl = document.URL.split("/")
var socketKind = dUrl[0].endsWith("s:") ? "wss" : "ws";
var httpKind = dUrl[0].endsWith("s:") ? "https" : "http";

var socket = io(socketKind + '://' + dUrl[2]);

const hookOpts = {
    before(context) {
        console.log('before all hook ran');
    },
    after(context) {
        console.log('after all hook ran');
    },
    error(context) {
        console.log('error all hook ran');
    }
};

//MODELS
var Book2editM = require('./models/book2edit');
var SearchM = require('./models/search');

const app = feathers()
    .configure(feathersSocket(socket))
    //TODO:register model here (with hook?)
    //   .configure(app.hooks())
    .configure(reactive(Object.assign(rxjs, { idField: '_id' }))) // you'll need this call to feathers-reactive for sync to work
    .configure(fm(m, stream));

const txtService = app.service('/libcat');

// window.txtService = txtService
window.Book2editM = Book2editM
window.m = m
// http://sru.gbv.de/gvk?version=1.1&operation=searchRetrieve&maximumRecords=10&recordSchema=picaxml&query=pica.ppn%3D100191029X
function App() {
    return {
        view: function () {
            return [
                m(Suche),
                m(BookEditBox)
            ]
        }
    }
}
function Suche() {
    function searchStuff() {
        if (SearchM.currentTerm)
            txtService.find({
                query: {
                    $sqs: {
                        $fields: [
                            // 'title^5',
                            // 'description'
                            '_all'
                        ],
                        $query: SearchM.currentTerm,
                        $operator: 'and'
                    }
                }
            }).then(res => {
                SearchM.setResult(res)
                console.log(res)
                m.redraw()
            })
        else
            console.log("Nothing to search for, yet.")

    }
    return {
        view: function () {
            return m("#suche",
                m("input#searchField[type=text]", {
                    placeholder: "Bitte hier Suchterm(e) eingeben."
                    , autocomplete: 'on' //TODO: not working in Chromium?
                    , name: 'searchcat'
                    , value: SearchM.currentTerm
                    , oninput: m.withAttr('value', SearchM.setCurrentTerm)
                    , onkeyup: function (e) {
                        if (e.keyCode == 13) {
                            searchStuff()
                        }
                    }
                })
                , m('button', {
                    onclick: searchStuff
                    , style: "margin-left: 5px; margin-bottom: 5px;"
                }, 'Go')
                , m(Suchergebnis)
            )
        }
    }
}
function Suchergebnis() {
    function editThisEntry(id, e) {
        e.preventDefault()
        Book2editM = txtService.get(id)
        m.redraw()
    }
    return {
        view() {
            return m("ol#searchResults",
                { style: "padding-left: 30px; background-color: #fff;" },
                SearchM.result.map(r => m("li[style=padding: 5px;]", m("a", { style: "cursor:pointer;", onclick: editThisEntry.bind(this, r._id) }, r['20'])))
            )
        }
    }
}

// called by fold/reduce
// val = ["_id", "1"] etc.
function printBookForEditing(acc, val) {
    // do not print meta-data with underscore as key
    if (val[0].indexOf("_") === 0)
        return acc;
    else if (val[0] === '849' && val[1].name && val[1].parent) {
        acc += val[0] + ' ' + val[1].name + '/' + val[1].parent + '\n'
        return acc
    }
    else if (val[0] === 'sub') {
        // do not print the subfields, these go into extra edit-boxes below
        return acc
    }
    else {
        acc += val[0] + ' ' + val[1] + '\n'
        return acc
    }
}

function printSubForEditing (acc, val) {
    acc += val[0] + ' ' + val[1] + '\n'
    return acc
}

function lineTo2Array(acc, curr) {
    var textBeforeFirstSpace = curr.slice(0, curr.indexOf(' ')) //i.e. #20 (the specific category)
    var textAfterFirstSpace = curr.slice(curr.indexOf(' ') + 1)
    // textAfter should be "_po/parentID" (po = part_of)
    var [po, id] = textAfterFirstSpace.split('/')
    if (textBeforeFirstSpace === '849' && po === '_po') {
        if (po && id)
            return (acc.push([textBeforeFirstSpace, { name: po, parent: id }]), acc)
        else
            return alert('Wenn Sie einen Artikel für einen schon angelegten Sammelband anlegen wollen, dann muss Feld 849 so aussehen: "849 _po/ID-des-Sammelbandes". Bitte versuchen Sie es noch einmal.')
    }
    return textAfterFirstSpace
        ? (acc.push([textBeforeFirstSpace, textAfterFirstSpace])
            , acc) // yes of horse, #push doesn't return the array, but the number of items in the array...
        : acc
}
function print_model_with(model, fn) {
    return _reduce(
        _toPairs(model)
            .sort((prev, next) => {
                // pad end of A/B with '0' if the 3th char is missing, i.e. 20 -> 200
                // so that sorting makes sense
                var padA = _padEnd(prev[0], 3, '0')
                var padB = _padEnd(next[0], 3, '0')
                if (padA < padB) return -1
                if (padA > padB) return 1
                // last case: zero-index-key of A and B is equal => not possible
                return 0
            }),

        fn,
        "")
}
function BookEditBox() {
    // Book2editM = txtService.get(1);
    // book.sync(true);
    function update_or_new_book() {
        var newText = document.getElementById('edit-book').value

        if (!newText) return alert("No content in EditBox!")

        var new2Array = newText.trim() //remove very last \n
            .split('\n')
            .reduce(lineTo2Array, [])

        // convert back to object
        var newObj = _fromPairs(new2Array);

        // when creating child docs, feathers needs the parentID (supplied in routing-prop)
        if (newObj[849] && newObj[849].parent) {
            // newObj.parent = newObj[849].parent
            newObj.routing = newObj[849].parent
        }

        var subs = document.getElementsByClassName('sub-edits')
        if (subs) {
            var subs_arr = Array.prototype.slice.call(subs),
                coll_subs = []
            subs_arr.forEach(textField => coll_subs.push(textField.value))
            var newSubs = coll_subs.map(sub => sub.trim().split('\n').reduce(lineTo2Array,[]))
            newObj.sub = newSubs.map(sub => _fromPairs(sub))
        }

        // Run the update or post new entry:
        if (Book2editM && Book2editM() && Book2editM()._id)
            txtService.update(Book2editM()._id, newObj)
                .then(res => {
                    console.log(res)
                    Book2editM = txtService.get(Book2editM()._id)
                    m.redraw()
                })
        else
            txtService.create(newObj)
                .then(res => {
                    // debugger
                    Book2editM = stream(res)
                    m.redraw()
                })
    }
    return {
        view() {
            // console.log(book())
            return m("#edit-book-div", [
                m('button', {
                    onclick: update_or_new_book
                    , style: "margin-bottom: 5px;"
                }, 'Update/Neu!')
                , m('button', {
                    onclick: function () { Book2editM = null }
                    , title: "Wenn die EditBox über diesen Button geleert wird, kann ein neuer Eintrag erstellt werden."
                    , style: "margin-bottom: 5px;"
                }, 'Leeren')
                , m("p[style=display:inline-block; background-color: white; padding: 2px; margin-left: 5px;]",
                    Book2editM && Book2editM() && Book2editM()._id ? 'Bearbeite Dokument: ' + Book2editM()._id : 'Neuer Eintrag kann erstellt werden.')
                , m('input', {
                    oninput: m.withAttr('value', SearchM.setCurrentPPN)
                    , placeholder: "GVK PPN search [HIT ENTER]"
                    , title: "Die EditBox wird mit dieser Aktion geleert."
                    , style: "margin-bottom: 5px; margin-left: 5px;"
                    , onkeyup: function (e) {
                        if (e.keyCode == 13 && SearchM.currentPPN) {
                            m.request("/gvk_ppn/"+SearchM.currentPPN)
                                .then(res => Book2editM = stream(res))
                        }
                    }
                })
                , m('textarea#edit-book', {
                    placeholder: "Einträge werden hier editiert/erstellt.",
                    // style: "background-color: gray;",
                    value: Book2editM && Book2editM()
                        ? print_model_with(Book2editM(), printBookForEditing)
                        // ? JSON.stringify(book2edit())
                        : ''
                })
                // ADD sub
                , m("button", {
                    onclick: () => {
                        // no book is edited atm
                        if (Book2editM === null)
                            Book2editM = stream({sub : [{"01": ""}]})
                        // book is edited which has already subentry
                        else if (Book2editM().sub && Book2editM().sub.length > 0)
                            Book2editM().sub.push({"01": ""})
                        // book is edited which has no subentries
                        else if (!Book2editM().sub || (Book2editM().sub && Book2editM().sub.length === 0)) {
                            // Book2editM = stream({sub : [{"01": ""}]})
                            Book2editM().sub = [{"01": ""}]
                        }
                        else {
                            console.log('[+] Sub: missing implementation!')
                        }
                    }}, "[+] Sub")
                // REMOVE sub
                , m("button", {
                    onclick: () => {
                        if (Book2editM && Book2editM() && Book2editM().sub)
                            if (Book2editM().sub.length === 1) Book2editM( _omit(Book2editM(), ['sub'] ) )
                            else Book2editM().sub.pop()
                    }}, "[-] Sub")
                , m("#sub-edit-book-div",
                    Book2editM && Book2editM() && Book2editM().sub && Book2editM().sub.length
                        ? Book2editM().sub.map((sub, idx) =>
                            m("textarea", {
                                value: print_model_with(sub, printSubForEditing)
                                , id: 'sub-edit-' + idx
                                , className: 'sub-edits'
                                , style: "height: 28vh; margin-top: 5px;"
                            }))
                        : null
                )
            ]);
        }
    };
}

// search in children to get THE parent
// txtService.find({query: {
//   $child: {
//     $type: '_po',
//     '20': 'intention'
//   }
// }}).then(res => console.log(res) )

// txtService.find({query: {
//   $nested: {
//                   $path: 'sub',
//                   'sub.01': 'tome'
//                 }
//
// }}).then(res => console.log(res) )

m.mount(document.getElementById('app'), App);
