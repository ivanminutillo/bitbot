import bip32utils from 'bip32-utils'
import bitcoin from 'bitcoinjs-lib'
import {hexEncode} from './utils'
import bip39 from 'bip39'

const NETWORKS = bitcoin.networks

/**
* Create a new Wallet from an existent xpub
* @param xpub : a valid xpub
* @return a new HDWallet
**/
export let createNodeFromXpub = (xpub, networks) => {
  networks = networks || bitcoin.networks.testnet
  let node = bitcoin.HDNode.fromBase58(xpub, bitcoin.networks.testnet)
  return node
}

export let sendToken = (provider, user, change, utxos, tokenAmount) => {
  var network = bitcoin.networks.testnet
  let wantedFee = 1500
  let actualInputValue
  actualInputValue = utxos.reduce((previousValue, currentValue) => Number(previousValue) + Number(currentValue.satoshis), 0)
  if (actualInputValue < Number(tokenAmount) + Number(wantedFee)) throw new Error('Not enough funds: ' + actualInputValue + ' < ' + (Number(tokenAmount) + Number(wantedFee)))
  let remainder = actualInputValue - tokenAmount - wantedFee
  var txb = new bitcoin.TransactionBuilder(network)
  // Add all available utxo to transaction
  utxos.forEach(function (utxo) {
    txb.addInput(utxo.txid, utxo.vout)
  })
  // Add first output: the machine and the choiced amount
  txb.addOutput(user, Number(tokenAmount))
  // Add second output: the change address
  txb.addOutput(change, remainder)
  // return the unfirmed serialized transaction
  return txb
}

/**
* Function to create a transaction
* @param utxos: the list of utxos to insert in the transaction
* @param machine: the machine address
* @param user: the user address
* @param recipeOpReturn: the profile status of the user
* @param wantedFee: the amount of satoshis tokens to give to miners
* @param tokenAmount: the amount of satoshis tokens to send to machine
* @param node
* @return new unfirmed transaction
*/
export let createTransaction = (machine, user, change, recipeOpReturn, representativesOpReturn, annulment, utxos) => {
  let tokenAmount = 100000
  let tokenFixed = 100000
  var network = bitcoin.networks.testnet
  let wantedFee = 3000

  let actualInputValue = utxos.reduce((previousValue, currentValue) => Number(previousValue) + Number(currentValue.satoshis), 0)

  if (actualInputValue < Number(tokenAmount)) {
    console.log('Not enough funds: ' + actualInputValue + ' < ' + (Number(tokenAmount)))
    let msg = {
      code: -1,
      message: 'Not enough funds: ' + actualInputValue + ' < ' + (Number(tokenAmount))
    }
    return msg
  }

  // Calculate the tokens to give back to change address
  let remainder
  if (annulment.length > 0) {
    remainder = actualInputValue - tokenAmount - tokenFixed
  }
  if (annulment.length === 0) {
    remainder = actualInputValue - tokenAmount
  }

  // Start the new transaction
  var txb = new bitcoin.TransactionBuilder(network)
  // Add all available utxo to transaction
  utxos.forEach(function (utxo) {
    txb.addInput(utxo.txid, utxo.vout)
  })

  // Add first output: the machine and the choiced amount
  txb.addOutput(user, Number(tokenAmount) - Number(wantedFee))

  if (recipeOpReturn[0].value !== 'revocation') {
    // Add second output (OP_RETURN): the recipe and the representatives
    var opReturn = new Uint8Array(80)
    // INSERT VERSION BYTE
    let versionByte = new Uint8Array([0])
    // INSERT RECIPE
    let adminBytes
    let recipeBytes
    if (recipeOpReturn[0].value === 'orchestrator') {
      adminBytes = new Uint8Array([1, 1, 1, 1])
      recipeBytes = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

    }
    else {
      let customRecipe = recipeOpReturn.map(function (value, i) {
        if (Number(value) === 32) {
          return 1
        } else if (Number(value) === 33) {
          return 2
        } else if (Number(value) === 34) {
          return 4
        } else if (Number(value) === 35) {
          return 8
        } else if (Number(value) === 36) {
          return 16
        } else if (Number(value) === 37) {
          return 32
        } else if (Number(value) === 38) {
          return 64
        } else if (Number(value) === 39) {
          return 128
        }
      })

      let recipe = customRecipe.reduce(function (a, b) {
        return a + b
      }, 0)
      adminBytes = new Uint8Array([0, 0, 0, 0])
      recipeBytes = new Uint8Array([recipe, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    }
    opReturn.set(versionByte)
    opReturn.set(adminBytes, 1)
    opReturn.set(recipeBytes, 5)
    if (representativesOpReturn.length > 0) {
      // INSERT M of N
      let mOfN = new Uint8Array([3])
      opReturn.set(mOfN, 19)
      // INSERT REPRESENTATIVES
      representativesOpReturn.map(function (representative, i) {
        opReturn.set(representative, (20 * (i + 1)))
      })
    }
    let bufferOpReturn = Buffer.from(opReturn)
    var dataScript = bitcoin.script.nullDataOutput(bufferOpReturn)
    txb.addOutput(dataScript, 0)
  }
  // Add third ouptup: the annulment and the amount
  if (annulment.length > 0) {
    txb.addOutput(annulment, Number(tokenAmount))
  }
  if (change.length > 0) {
    // Add forth outpup: the change and the remainder
    txb.addOutput(change, remainder)
  }
  // return the unfirmed serialized transaction
  // return txb
  console.log('qui ci entra')
  let msg = {
    code: 0,
    message: txb
  }
  return msg
}

/**
* Create a new HDNode from seed
* @param seed : the master password, don't forget it!
* @param network : if not specified it will use the bitcoin mainnet network
* @return the HDNode
**/
export let HDNodeFromSeed = (seed, networks) => {
  networks = networks || NETWORKS.testnet
  let seedHex = bip39.mnemonicToSeedHex(seed)
  let m = bitcoin.HDNode.fromSeedHex(seedHex, networks)
  // m = m.deriveHardened(44)
  // m = m.deriveHardened(0)
  return m
}

/**
* Create a new Wallet from an existent HDNode
* @param node: the HDNode
* @return HDWallet
**/
export let createWalletFromNode = (node) => {
  let external = node.derive(0)
  let internal = node.derive(1)
  return new Wallet(external, internal)
}

/**
* Create a new Wallet from an existent HDNode
* @param seed : the master password, don't forget it!
* @param network : if not specified it will use the bitcoin mainnet network
* @return HDWallet
**/
export let walletFromSeed = (seed, networks) => {
  let node = HDNodeFromSeed(seed, networks)
  node = node.deriveHardened(0).deriveHardened(0)
  let wallet = createWalletFromNode(node)
  return wallet
}

export let nodeFromSeed = (seed, networks) => {
  let node = HDNodeFromSeed(seed, networks)
  return node
}

/**
* Default function to create a new HD Wallet
* @param external
+ @param internal
* @return new account
*/
function Wallet (external, internal) {
  let chains
  if (Array.isArray(external)) {
    chains = external
    this.external = chains[0].getParent()
    this.internal = chains[1].getParent()
  } else {
    chains = [
      new bip32utils.Chain(external.neutered()),
      new bip32utils.Chain(internal.neutered())
    ]
    this.external = external
    this.internal = internal
  }
  this.account = new bip32utils.Account(chains)
}

Wallet.prototype.getAllAddresses = function () { return this.account.getAllAddresses() }
Wallet.prototype.getNetwork = function () { return this.account.getNetwork() }
Wallet.prototype.getReceiveAddress = function () { return this.account.getChainAddress(0) }
Wallet.prototype.getChangeAddress = function () { return this.account.getChainAddress(1) }
Wallet.prototype.isReceiveAddress = function (address) { return this.account.isChainAddress(0, address) }
Wallet.prototype.isChangeAddress = function (address) { return this.account.isChainAddress(1, address) }
Wallet.prototype.nextReceiveAddress = function () { return this.account.nextChainAddress(0) }
Wallet.prototype.nextChangeAddress = function () { return this.account.nextChainAddress(1) }
