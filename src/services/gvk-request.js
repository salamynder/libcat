const rp = require('request-promise')
const convert = require('xml-js').xml2json
const _has = require('lodash/has')
const _get = require('lodash/get')

// route gvk_ppn/:ppn
const get_from_gvk_url = "http://sru.gbv.de/gvk?version=1.1&operation=searchRetrieve&maximumRecords=10&recordSchema=turbomarc&query=pica.ppn%3D"

const gvk_ppn = function(req,res) {
    let ppn = req.params.ppn
    if (ppn) {
        gvk_get_with_ppn(ppn)
            .then(erg => res.send(erg))
    }
}
module.exports = {
    gvk_ppn
}

function gvk_get_with_ppn (ppn){
    return rp(get_from_gvk_url+ppn)
        .then(xml => convert(xml, {compact: true}))
        .then(json => test_and_transform(json))
        .catch(e => console.log(e))
}

const success_path = [
    "zs:searchRetrieveResponse"
    ,"zs:records"
    ,"zs:record"
    ,"zs:recordData"
    ,"r"
]

function mkPath (id, sX) {
    return [
        "d"+id
        , "s"+sX
        , "_text"]
}

function mkPath_idx (id, sX, _text_idx) {
    return [
        "d"+id
        , "s"+sX
        , _text_idx
        , "_text"]
}

function mkPath_idx_s (id, _s_idx, sX) {
    return [
        "d"+id
        , _s_idx
        , "s"+sX
        , "_text"]
}

const title_a = mkPath("245", "a")
    , title_b = mkPath("245", "b")
    , title_c = mkPath("245", "c") //39: Verfasser/Hrsg in Vorlageform?


    // Verfasser:
    , name_a  = mkPath("100", "a")
    , name_b  = mkPath("100", "b")
    , name_c  = mkPath("100", "c")
    , name_0  = mkPath_idx("100", "0", "0")
    // ^ PPN-identifier: e.g. Cusanus: https://gso.gbv.de/DB=2.1/PPNSET?PPN=079381545
    // (DE-601)079381545 : (GVK)PPN
    // (DE-588)118508172 : (GND)

    , auflage = mkPath("250", "a")

    , ort     = mkPath("260", "a") // might be an array!
    , verlag  = mkPath("260", "b")
    , jahr    = mkPath("260", "c")

    , umfang  = mkPath("300", "a")

    // also in d800 without array!
    , ueSchrift_a  = mkPath_idx_s("490", "0", "a") // übergeordnete Schriftenreihe
    , ueSchrift_v  = mkPath_idx_s("490", "0", "v") // Heft/Teil-Angabe

    // also in d830 without array and without text like "Philosophische Bibliothek"!
    , ueGesamt_a   = mkPath_idx_s("490", "1", "a") // übergeordnete Gesamtheit
    , ueGesamt_v   = mkPath_idx_s("490", "1", "v") // übergeordnete Gesamtheit

    // d700.map ?
    , hrsg = ["d700"] // Bohrmann, Karl
    , hrsg_a = mkPath_idx_s("700", "0", "a") // Bohrmann, Karl
    , hrsg_0 = mkPath_idx_s("700", "0", "0") // (DE-601)138997365


function test_and_transform (str) {
    let o = JSON.parse(str)
    var r // the single record we're expecting

    if (_has(o, success_path))
        r = _get(o, success_path)
    else
        throw new Error("Couldn't find record field in response data. Wrong PPN?")



    console.log(JSON.stringify(r,null,2))

    let newObj = {
        "20": _get(r, title_a) + " : " + (_has(r, title_b) ? _get(r, title_b) : '')
    }

    // 32 RVK Kategorie (Regensburger Verbundklassifikation) -- d084
    if (_has(r, "d084")) {
        let ks = _get(r, "d084")
        if (ks && ks.length) {
            let rvk = ks.reduce( (acc, curr) => {
                if (curr.s2._text === 'rvk')
                    return acc+curr.sa._text
                else
                    return acc
            }, "")
            if (rvk) Object.assign(newObj, {"32R": rvk})
        }
    }


    // 37 Sprachen -- d041
    if (_has(r, "d041")) {
        let os = _get(r, "d041")

        if (os && os.sa && os.sa.length) {
        //process array
            let sprachen = os.sa.reduce( (acc,curr,i,os_arr) =>
                curr._text + ( ((os_arr.length-2) === i) ? "" : ' ; ') +acc, "" )
            Object.assign(newObj, {"37": sprachen})
        }
        else
        if (os)
            Object.assign(newObj, {"37": os.sa._text})
    }

    // 39 Untertitel mit Verfasser/Hrsg.-Erwähnung
    if (_has(r, title_c))
        Object.assign(newObj, {"39": _get(r, title_c)})


    // 40 Verfasser
    if (_has(r, "d100")) {
        let os = _get(r, "d100")
        if (os.length) {
            // TODO
        }
        else {
            let verf = _get(r, name_a)
            Object.assign(newObj, {
                "40": verf
                    + (_has(r, name_c)
                        ? " "+_get(r, name_c)
                        : '')
                    + " / "
                    + (os.s0 && os.s0.length
                        ? os.s0[0]._text
                        : (os.s0 ? os.s0._text : os._text))
            })
        }
    }


    // 41 Herausgeber / editor
    if (_has(r, hrsg)) {
        let hs = _get(r, hrsg)
        if (hs.length)
        //process array
            hs.forEach( (h,idx) => {
                Object.assign(newObj, {
                    ["41"+ (idx===0 ? '' : ++idx) ]: h.sa._text +" / "+ (h.s0.length ? h.s0[0]._text : h.s0._text)
                })
            })
        else
            Object.assign(newObj, {"41": hs.sa._text})
    }

    // 74 Ort(e)
    if (_has(r, "d260")) {
        let os = _get(r, "d260.sa")

        if (os && os.length) {
        //process array
            let orte = os.reduce( (acc,curr,i,os_arr) =>
                curr._text + ( ((os_arr.length-2) === i) ? "" : ', ') +acc, "" )
            Object.assign(newObj, {"74": orte})
            // => "74": "London, New York",
        }
        else
        if (os)
            Object.assign(newObj, {"74": os._text})
    }

    // 75 Verlag
    if (_has(r, verlag)) {
        let verl = _get(r, verlag)
        Object.assign(newObj, {"75": verl})
    }

    // 76 Jahr
    if (_has(r, jahr)) {
        let j = _get(r, jahr)
        Object.assign(newObj, {"76": j})
    }

    // 77 Anzahl Bände (# of volumes)
    if (_has(r, umfang)) {
        let u = _get(r, umfang)
        Object.assign(newObj, {"77": u})
    }

    var delim = / [/;]/

    // 84 Schriftreihe
    // 85 übergeordnete Gesamtheit
    if (_has(r, "d490")) {
        let os = _get(r, "d490")

        if (os && os.length) {
        //process array
            Object.assign(newObj, {
                "84": os[0].sa._text+ os[0].sv._text,
                "85": os[1].sa._text
                    + (delim.test(os[1].sv._text)
                        ? os[1].sv._text
                        : " / "+os[1].sv._text)
            })
        }
        else
        if (os)
            Object.assign(newObj, {
                "84": os.sa._text
                    + (delim.test(os.sv._text)
                        ? os.sv._text
                        : " / "+ os.sv._text)
            })
    }

    // 87 ISBN
    if (_has(r, "d020")) {
        let os = _get(r, "d020")

        if (os && os.length) {
        //process array
            Object.assign(newObj, {"87": os[0].s9._text, "872":os[1].s9._text+" (elektr.)"})
        }
        else
        if (os)
            Object.assign(newObj, {"87": os.s9._text})
    }

    // 89P PPN
    if (_has(r, "c001")) {
        let os = _get(r, "c001")

        if (os)
            Object.assign(newObj, {"89P": os._text})
    }

    console.log(JSON.stringify(newObj,null,2))

    return newObj
}

// var args = process.argv
// gvk_get_with_ppn(args[2] ? args[2] : "355829819")