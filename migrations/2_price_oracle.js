"use strict";

const PriceOracle = artifacts.require("./PriceOracle.sol");
const {deploy, load} = require('../scripts/javascript/deployUtils');

const posterAddress = process.env["POSTER_ADDRESS"];
if (!posterAddress) {
  throw "POSTER_ADDRESS env var must be set";
}

const readerArgCount = 2; // Price Oracle expects two reader args

module.exports = function(deployer, network) {
  let promise;

  const networkConfig = load(network);

  let readerArgs = [];

  if (networkConfig && networkConfig.Tokens) {
    const readerTokens = Object.values(networkConfig.Tokens).filter((token) => token.reader);
    const readerTokenNames = readerTokens.map((token) => token.tokenName);

    if (readerTokens.length > 2) {
      throw "Cannot deploy more than two reader tokens, got: ${readerTokenNames}";
    }

    console.log(`[Oracle Deploy] Using price oracle harness with reader tokens: ${readerTokenNames}`);

    readerTokens.forEach(readerToken => {
      readerArgs.push(readerToken.address, readerToken.reader);
    });
  } else {
    console.log(`[Oracle Deploy] Using price oracle harness with no reader tokens`);
  }

  // Pad to exactly 2 values per expected reader arg
  while (readerArgs.length < readerArgCount * 2) {
    readerArgs.push(0);
  }

  const deployArgs = [posterAddress].concat(readerArgs);

  return deploy(deployer, network, PriceOracle, deployArgs);
};
