const PaymentChannel  = artifacts.require("./PaymentChannel.sol");
const sender =  "0x627306090abab3a6e1400e9345bc60c78a8bef57";
const duration = 432000;

module.exports = function(deployer) {
  deployer.deploy(PaymentChannel, sender, duration);
};
