// @flow

class Response {
  status: number
  method: string
  transaction_id: number
  _text: string

  /*
   * @params {number} status - 200,404 etc.
   * @params {string} method - "get", "post" etc
   * @params {number} transaction_id
   * @params {string} text
   */
  constructor( {status, method, transaction_id, text}:
      {status: number, method: string, transaction_id: number, text: string}) {
    if( typeof(status) !== 'number' ||
        typeof(method) !== 'string' ||
        typeof(transaction_id) !== 'number' ||
        typeof(text) !== 'string' ) throw new Error('invalid options')
    this.status = status
    this.method = method
    this.transaction_id = transaction_id
    this._text = text
  }

  text():Promise<any> {
    return new Promise((resolv, reject) => {
      if(this._text && typeof(this._text) === 'string') resolv(this._text)
      else reject(new Error("can not find text"))
    })
  }

  json():Promise<any> {
    return new Promise((resolv, reject) => {
      this.text().then(text => {
        try {
          const json = JSON.parse(text)
          resolv(json)
        } catch(err) {
          reject(err)
        }
      }).catch(err => {
        reject(err)
      })
    })
  }
}

module.exports = Response
