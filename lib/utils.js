// @flow

import utf8 from 'utf8'
import bitcoin from 'bitcoinjs-lib'

/**
* Helper function to derive the node according to the bip44 spec
* @param master: the genesis node
+ @param accountIndex : 1 or 0 the account number to start with
* @return the new path m/44'/0'/accountIndex'
*/
export let deriveAccount = (master, accountIndex) => {
  let node = master
  // purpose'
  node = node.deriveHardened(44)
  // coin_type'
  node = node.deriveHardened(0)
  // account'
  // node = node.deriveHardened(accountIndex)
  return node
}

// Convert string to hex
export let hexEncode = (seed) => {
  let str = ''
  for (let i = 0; i < seed.length; i++) {
    str += seed[i].charCodeAt(0).toString(16)
  }
  str = utf8.encode(str)
  return str
}

export let formatRequest = (sender, method, params) => {
  let msg = {
    'sender': '',
    'body': {
      'method': 0,
      'params': '',
      'id': '100'
    }
  }
  msg.sender = sender
  msg.body.method = method
  msg.body.params = params
  storeId(msg.body.id)
  let msgJSON = JSON.stringify(msg)
  return msgJSON
}

export let storeId = (sessionId) => {
  console.log('registra id' + sessionId)
  sessionStorage.setItem('id', sessionId)
}

let recoverId = ()  => {
  console.log('ritorna id')
  let sessionId = sessionStorage.getItem('id')
  console.log(sessionId)
  return sessionId
}

let queryMethod = (msg)  => {
  let res
  switch (msg.body.error) {
    case 0:
      console.log('communication is ok')
      console.log(msg.body.result)
      return msg.body.result
    case 1:
      res = 'no contract'
      console.log(res)
      return res
    case 2:
      res = 'no permission'
      console.log(res)
      return res
    default:
      res = 'invalid code'
      console.log(res)
      return res
  }
}

export let parseResult = (msg)  => {
  // Validate the sender address obtained from the authentication process
  // Validate the id if its the same of the request sent
  let msgObj = JSON.parse(msg)
  let id = recoverId()
  if (Number(msgObj.body.id) === Number(id)) {
    queryMethod(msgObj)
  } else {
    let msg = 'the id is not the same of the request'
    return msg
  }
}
