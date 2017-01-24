var vorpal = require('vorpal')()
import async from 'async'
import {walletFromSeed} from './lib/wallet'
import bip39 from 'bip39'
import axios from 'axios'
let wallet
console.log(`
-----------------------------------------------
mooooooooo... I am an fucking idiot bitcoin bot
-----------------------------------------------
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`)

vorpal
  .command('create [wallet]', 'Create a new wallet from a randomic seed')
  .action(function (args, cb) {
    const self = this
    if (args.wallet === 'wallet') {
      self.log('lets generate a brand new wallet')
      let mnemonic = bip39.generateMnemonic()
      self.log('Store in a safe place the following recover seed: ' + mnemonic)
      this.prompt({
        type: 'input',
        name: 'seed',
        message: 'Let\'s type the seed generated for security reason: ',
        validate: function (value) {
          if (value === mnemonic) {
            return true
          }
          return 'Please enter the valid seed'
        }
      }, function (result) {
        if (result.seed === mnemonic) {
          wallet = walletFromSeed(mnemonic)
          self.log('Nice! Il tuo wallet è stato correttamente generato')
          cb()
        }
      })
    }
  })

vorpal
  .command('get [item]', 'get info from your wallet')
  .option('-c, --change', 'get unused change address')
  .option('-r, --receive', 'get unused receiver address')
  .action(function (args, callback) {
    const self = this
    let addr
    if (args.item === 'address') {
      if (args.options.change) {
         addr = wallet.getChangeAddress()
        self.log('il tuo nuovo indirizzo di change è ' + addr)
      } else if (args.options.receive) {
         addr = wallet.getReceiveAddress()
        self.log('il tuo nuovo indirizzo di ricezione è ' + addr)
      } else {
         addr = wallet.getReceiveAddress()
        self.log('il tuo nuovo indirizzo di ricezione è ' + addr)
      }
      callback()
    }
    else if (args.item === 'balance') {
      let changeAddr = wallet.getChangeAddress()
      let receiveAddr = wallet.getReceiveAddress()
      axios.get('http://appliance3.uniquid.co:8080/insight-api/addr/' + changeAddr + '/balance')
      .then(function (res) {
        self.log('Possiedi ' + res.data + ' Satoshi')
        callback()
      })
      .catch(function (error) {
        self.log(error)
        callback()
      })
    }
  })

vorpal
  .delimiter('btcBot$')
  .show()
