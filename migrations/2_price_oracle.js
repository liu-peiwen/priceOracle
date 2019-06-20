"use strict";

const PriceOracle = artifacts.require("./PriceOracle.sol");

const posterAddress = process.env.POSTER_ADDRESS;
if (!posterAddress) {
  throw "POSTER_ADDRESS env var must be set";
}

module.exports = function(deployer) {
    deployer.deploy(PriceOracle, 
                    process.env.POSTER_ADDRESS,
                    process.env.ADDR0,
                    process.env.READER0,
                    process.env.ADDR1,
                    process.env.READER1
                    );
};
