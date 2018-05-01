import { increaseTime, duration } from './helpers/increaseTime';
import { getTransactionGasCost } from './helpers/getGasCost';

const abi = require('ethereumjs-abi')
const utils = require('ethereumjs-util')
const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const PaymentChannel = artifacts.require("PaymentChannel");

contract("PaymentChannel", ([sender, recipient, nonSender, nonRecipient]) => {
  const value = new web3.BigNumber(web3.toWei(0.003, "ether"));
  const sentValue = new web3.BigNumber(web3.toWei(0.001, "ether"));
  const addedValue = new web3.BigNumber(web3.toWei(0.002, "ether"));
  const zeroValue = new web3.BigNumber(web3.toWei(0, "ether"));
  const time = duration.days(5);
  let channel;

  beforeEach(async () => {
    channel = await PaymentChannel.new(recipient, time, { value: value, from: sender });
  })

  describe("openChannel", () => {
    it("addDeposits ETH by sender", async () => {
      await channel.addDeposit({ value: addedValue, from: sender });
      await web3.eth.getBalance(channel.address).should.be.bignumber.equal(value.plus(addedValue));
    })
  })

  describe("payments off-chain", () => {
    it("collectly verifies off-chain payments, then close channel", async() => {
      const paymentMsg = abi.soliditySHA3(
        ["address", "uint256"],
        [channel.address, sentValue.toNumber()]
      );
      const sig = await web3.eth.sign(sender, "0x" + paymentMsg.toString("hex"));

      const prefixedMsg = abi.soliditySHA3(
        ["string", "bytes32"],
        ["\x19Ethereum Signed Message:\n32", paymentMsg]
      );
      const split = utils.fromRpcSig(sig);
      const pubKey = utils.ecrecover(prefixedMsg, split.v, split.r, split.s);
      const signer = utils.pubToAddress(pubKey).toString("hex");

      signer.toLowerCase().should.equal(utils.stripHexPrefix(sender).toLowerCase());
      // at this time, the sender has 0.002 eth, and the recipient has 0.001 eth in the paymentchannel.
      const pre = web3.eth.getBalance(recipient);
      const res = await channel.close(sentValue.toNumber(), sig, { from: recipient }).should.be.fulfilled;
      const post = web3.eth.getBalance(recipient);
      const gas = getTransactionGasCost(res["tx"]);
      post.minus(pre).plus(gas).should.be.bignumber.equal(sentValue);
    })

    it("recipient should deny off-chain message from non-sender", async () => {
      const paymentMsg = abi.soliditySHA3(
        ["address", "uint256"],
        [channel.address, sentValue.toNumber()]
      );
      const sig = await web3.eth.sign(nonSender, "0x" + paymentMsg.toString("hex"));

      const prefixedMsg = abi.soliditySHA3(
        ["string", "bytes32"],
        ["\x19Ethereum Signed Message:\n32", paymentMsg]
      );
      const split = utils.fromRpcSig(sig);
      const pubKey = utils.ecrecover(prefixedMsg, split.v, split.r, split.s);
      const signer = utils.pubToAddress(pubKey).toString("hex");

      signer.toLowerCase().should.not.equal(utils.stripHexPrefix(sender).toLowerCase());
    })

    it("recipient can withdraw without closing the channel", async () => {
      const paymentMsg = abi.soliditySHA3(
        ["address", "uint256"],
        [channel.address, sentValue.toNumber()]
      );
      const sig = await web3.eth.sign(sender, "0x" + paymentMsg.toString("hex"));

      const prefixedMsg = abi.soliditySHA3(
        ["string", "bytes32"],
        ["\x19Ethereum Signed Message:\n32", paymentMsg]
      );
      const split = utils.fromRpcSig(sig);
      const pubKey = utils.ecrecover(prefixedMsg, split.v, split.r, split.s);
      const signer = utils.pubToAddress(pubKey).toString("hex");

      signer.toLowerCase().should.equal(utils.stripHexPrefix(sender).toLowerCase());
      const pre = web3.eth.getBalance(recipient);
      const res = await channel.withdraw(sentValue.toNumber(), sig, { from: recipient }).should.be.fulfilled;
      const post = web3.eth.getBalance(recipient);
      const gas = getTransactionGasCost(res["tx"]);
      post.minus(pre).plus(gas).should.be.bignumber.equal(sentValue);
    })

    it("sender sends 0.002eth after recipient withdraws 0.001eth, then recipient can withdraw remaining 0.001eth when closing the channel", async () => {
      const paymentMsg1 = abi.soliditySHA3(
        ["address", "uint256"],
        [channel.address, sentValue.toNumber()]
      );
      const sig1 = await web3.eth.sign(sender, "0x" + paymentMsg1.toString("hex"));
      await channel.withdraw(sentValue.toNumber(), sig1, { from: recipient }).should.be.fulfilled;


      const paymentMsg2 = abi.soliditySHA3(
        ["address", "uint256"],
        [channel.address, addedValue.toNumber()]
      );
      const sig2 = await web3.eth.sign(sender, "0x" + paymentMsg2.toString("hex"));

      const prefixedMsg = abi.soliditySHA3(
        ["string", "bytes32"],
        ["\x19Ethereum Signed Message:\n32", paymentMsg2]
      );
      const split = utils.fromRpcSig(sig2);
      const pubKey = utils.ecrecover(prefixedMsg, split.v, split.r, split.s);
      const signer = utils.pubToAddress(pubKey).toString("hex");

      signer.toLowerCase().should.equal(utils.stripHexPrefix(sender).toLowerCase());

      await channel.addDeposit({ value: addedValue, from: sender });
      const pre = web3.eth.getBalance(recipient);
      const res = await channel.close(addedValue.toNumber(), sig2, { from: recipient }).should.be.fulfilled;
      const post = web3.eth.getBalance(recipient);
      const gas = getTransactionGasCost(res["tx"]);
      post.minus(pre).plus(gas).should.be.bignumber.equal(sentValue);
    })
  })

  describe("closeChannel", () => {
    it("should not allow non-recipient to close the channel", async () => {
      const paymentMsg = abi.soliditySHA3(
        ["address", "uint256"],
        [channel.address, sentValue.toNumber()]
      );
      const sig = await web3.eth.sign(sender, "0x" + paymentMsg.toString("hex"));

      const prefixedMsg = abi.soliditySHA3(
        ["string", "bytes32"],
        ["\x19Ethereum Signed Message:\n32", paymentMsg]
      );
      const split = utils.fromRpcSig(sig);
      const pubKey = utils.ecrecover(prefixedMsg, split.v, split.r, split.s);
      const signer = utils.pubToAddress(pubKey).toString("hex");

      signer.toLowerCase().should.equal(utils.stripHexPrefix(sender).toLowerCase());
      const res = await channel.close(sentValue.toNumber(), sig, { from: nonRecipient }).should.be.rejectedWith('revert');
    })

    it("sender can claim remaining after expiration", async () => {
      await increaseTime(duration.days(6));
      const pre = web3.eth.getBalance(sender);
      const res = await channel.timeout();
      const post = web3.eth.getBalance(sender);
      const gas = getTransactionGasCost(res["tx"]);
      post.minus(pre).plus(gas).should.be.bignumber.equal(value);
      web3.eth.getBalance(channel.address).should.be.bignumber.equal(zeroValue);
    })
  })
})