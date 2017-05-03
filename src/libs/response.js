class Response {
  constructor(options) {
    this.status = options.status
    this.method = options.method
    this.transaction_id = options.transaction_id
    this._text = options.text
  }


  text() {
    return new Promise((resolv, reject) => {
      if(this._text && typeof(this._text) === 'string') resolv(this._text)
      else reject(new Error("can not find text"))
    })
  }

  json() {
    return new Promise((resolv, reject) => {
      try {
        resolv(JSON.parse(this.text))
      } catch(err) {
        reject(err)
      }
    })
  }
}

module.exports = Response