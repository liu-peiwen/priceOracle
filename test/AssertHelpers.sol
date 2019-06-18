pragma solidity >=0.4.25 <0.6.0;

import "truffle/Assert.sol";
import "../contracts/ErrorReporter.sol";

contract AssertHelpers is ErrorReporter {

    function assertError(Error expected, Error given, string memory message) internal {
        Assert.equal(uint(expected), uint(given), message);
    }

    function assertNoError(Error err) internal {
        assertError(Error.NO_ERROR, err, "should have error NO_ERROR");
    }

    function assertZero(uint value, string memory message) internal {
        Assert.equal(0, value, message);
    }
}