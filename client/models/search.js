var Search = {
    currentTerm: '',
    setCurrentTerm(value) {
        Search.currentTerm = value;
    },
    result: [],
    setResult(value) {
        Search.result = value;
    }
}
module.exports = Search