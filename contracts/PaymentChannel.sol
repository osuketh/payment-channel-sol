pragma solidity ^0.4.21;

import "./zeppelin/SafeMath.sol";
import "./zeppelin/ECRecovery.sol";
import "./zeppelin/Ownable.sol";

contract PaymentChannel is Ownable {
  using SafeMath for uint256;
  using ECRecovery for bytes32;

  address public recipient;
  uint256 public expiration;
  uint256 public withdrawnAmount;

  modifier onlyRecipient() {
    require(msg.sender == recipient);
    _;
  }

  function PaymentChannel(address _recipient, uint256 _duration) public payable {
    recipient = _recipient;
    expiration = block.timestamp.add(_duration);
  }

  function addDeposit() public payable onlyOwner {
  }

  function timeExtend(uint256 _addTime) public onlyOwner {
    expiration = expiration.add(_addTime);
  }

  function withdraw(uint256 _amount, bytes _sig) public onlyRecipient {
    require(_isValidSig(_amount, _sig));
    uint256 amountToWithdraw = _amount.sub(withdrawnAmount);
    withdrawnAmount = withdrawnAmount.add(amountToWithdraw);
    msg.sender.transfer(amountToWithdraw);
  }

  function close(uint256 _allAmount, bytes _sig) public onlyRecipient {
    require(_isValidSig(_allAmount, _sig));
    uint256 amountToWithdraw = _allAmount.sub(withdrawnAmount);
    recipient.transfer(amountToWithdraw);
    selfdestruct(owner);
  }

  function timeout() public {
    require(block.timestamp >= expiration);
    selfdestruct(owner);
  }

  function _isValidSig(uint256 _amount, bytes _sig) internal view returns (bool) {
    bytes32 message = keccak256(this, _amount).toEthSignedMessageHash();
    return message.recover(_sig) == owner;
  }
}