// Abstract contract for the full DSValue standard
// --
pragma solidity >=0.4.25 <0.6.0;

import "../contracts/DSValue.sol";

contract DSValueHarness is DSValue {
    bool public has;
    bytes32 public val;

    constructor(bytes32 initVal) public {
        if (initVal != 0) {
            has = true;
            val = initVal;
        }
    }

    function peek() public view returns (bytes32, bool) {
        return (val, has);
    }

    function read() public view returns (bytes32) {
        return val;
    }

    function set(bytes32 _val) public {
        val = _val;
        has = true;
    }

    function unset() public {
        has = false;
    }
}