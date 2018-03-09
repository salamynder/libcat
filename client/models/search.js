var Search = {
    currentTerm: '',
    setCurrentTerm(value) {
        Search.currentTerm = value;
    },
    result: [],
    setResult(value) {
        Search.result = value;
    },
    currentPPN: '',
    setCurrentPPN(value) {
        Search.currentPPN = value
    }
}
module.exports = Search