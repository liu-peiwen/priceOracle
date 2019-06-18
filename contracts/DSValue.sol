// Abstract contract for the full DSValue standard
// --
pragma solidity >=0.4.25 <0.6.0;

contract DSValue {
    // TODO: View or constant? It's clearly a view...
    function peek() public view returns (bytes32, bool);

    function read() public view returns (bytes32);
}