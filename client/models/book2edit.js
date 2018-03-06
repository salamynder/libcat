var book = null;// Wenn nicht-null (Promise fulfilled), dann ist `book` ein
                // mithril-property-function-getter-setter, d.h. um an die Daten zu kommen, muss
                // die Funktion ohne Argument aufgerufen werden.
// book will be such an object (ES-GET):
//{
//    "_id": "1",
//    "_meta": {
//        "_index": "text",
//        "_type": "book",
//        "_id": "1",
//        "_version": 9,
//        "found": true
//    },
//    "#20": "Reassessing reform : a historical investigation into church renewal",
//    "#30": "Tr 21 * yb: Dauerleihgabe der Universität Trier",
//    "#31": "Katholische Kirche ; Kirchliche Erneuerung ; Geschichte ; Kongress ; Gettysburg, Pa. <2008>",
//    "#37": "eng",
//    "#39": "edited by Christopher M. Bellitto and David Zachariah Flanagin",
//    "#41": "Bellitto, Christopher M.",
//    "#412": "Flanagin, David Zachariah",
//    "#74": "Washington, D. C.",
//    "#75": "Catholic University of America Press",
//    "#76": "2012",
//    "#77": "XII, 289 S.",
//    "#83": "Gettysburg 2008",
//    "#87": "978-0-8132-1999-8*",
//    "#8e": "http://swbplus.bsz-bw.de/bsz380377365inh.htm = Inhaltsverzeichnis",
//    "#90": "Tr 21 * yb 113",
//    "#96a": "prov.",
//    "#96c": "Brö",
//    "#99e": "20151210/14:45:50-25/2▼obroesch",
//    "#99m": "LOC",
//    "#99n": "20150311/17:59:27"
//}
// FRAGEN:
// 1. Wie _id und #00 zusammendenken? (PPN? vom gemeinsamen Verbundkatalog, GVK, auch nicht vergessen?)
// - die _id/#00 sollte nicht händisch vergeben werden!

module.exports = book;