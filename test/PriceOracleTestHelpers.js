"use strict";

const {getContract, readAndExecContract} = require('./Contract');
const EIP20 = getContract("./test/EIP20Harness.sol");
const PriceOracle = getContract("./PriceOracle.sol");
const PriceOracleHarness = getContract("./test/PriceOracleHarness.sol");
const DSValueHarness = getContract("./test/DSValueHarness.sol");
const { encodeUint } = require('./Utils');

async function setupPricingContracts(anchorAdmin, poster, root, useHarness=false) {
  const asset = await EIP20.new(100, "omg", 18, "omg").send({from: root});
  const readerAsset = await EIP20.new(100, "dai", 18, "dai").send({from: root});
  const readerOracle = await DSValueHarness.new(encodeUint(80.0e18)).send({from: root});

  let priceOracle;

  if (useHarness) {
    priceOracle = await PriceOracleHarness.new(poster, readerAsset._address, readerOracle._address, 0, 0).send({from: anchorAdmin});
  } else {
    priceOracle = await PriceOracle.new(poster, readerAsset._address, readerOracle._address, 0, 0).send({from: anchorAdmin});
  }

  return {
    priceOracle: priceOracle,
    asset: asset,
    readerAsset: readerAsset,
    readerOracle: readerOracle
  }
}

async function setupPricingHarnessContracts(anchorAdmin, poster, root) {
  const asset = await EIP20.new(100, "omg", 18, "omg").send({from: root});
  const readerAsset = await EIP20.new(100, "dai", 18, "dai").send({from: root});
  const readerOracle = await DSValueHarness.new(encodeUint(0)).send({from: root});
  const readerAsset2 = await EIP20.new(100, "usdc", 18, "usdc").send({from: root});
  const readerOracle2 = await DSValueHarness.new(encodeUint(0)).send({from: root});

  const priceOracle = await PriceOracleHarness.new(
    poster,
    readerAsset._address,
    readerOracle._address,
    readerAsset2._address,
    readerOracle2._address
  ).send({from: anchorAdmin});

  return {
    priceOracle: priceOracle,
    asset: asset,
    readerAsset: readerAsset,
    readerOracle: readerOracle,
    readerAsset2: readerAsset2,
    readerOracle2: readerOracle2
  }
}

async function setupPricingContractsWithMultipleAssets(anchorAdmin, poster, root, numAssets=5, includeReader=false, includeSecondReader=false) {
  let priceOracle;
  let readerAsset;
  let readerOracle;
  let readerAsset2;
  let readerOracle2;

  if (numAssets < 1) {
    throw "numAssets must be >= 1";
  }

  if (includeSecondReader && numAssets < 2) {
    throw "numAssets must be >= 2 with second reader";
  }

  const isReader = (index) =>
    (
      ( includeReader && index == numAssets - 1 ) ||
      ( includeSecondReader && index == numAssets - 2 )
    );

  let assets = Array(numAssets);

  for (let i = 0; i < numAssets; i++) {
    if (isReader(i)) {
      assets[i] = await EIP20.new(100, `Reader #${i}`, 18, `rdr${i}`).send({from: root});
    } else {
      assets[i] = await EIP20.new(100, `OmiseGo #${i}`, 18, `omg${i}`).send({from: root});
    }
  }

  if (includeReader) {
    readerAsset = assets[numAssets - 1];
    readerOracle = await DSValueHarness.new(encodeUint(200.0e18)).send({from: root});
  }

  if (includeSecondReader) {
    readerAsset2 = assets[numAssets - 2];
    readerOracle2 = await DSValueHarness.new(encodeUint(80.0e17)).send({from: root});
  }

  priceOracle = await PriceOracle.new(
    poster,
    readerAsset ? readerAsset._address : 0,
    readerOracle ? readerOracle._address : 0,
    readerAsset2 ? readerAsset2._address : 0,
    readerOracle2 ? readerOracle2._address : 0
  ).send({from: anchorAdmin});

  return {
    priceOracle: priceOracle,
    assets: assets,
    readerAsset: readerAsset,
    readerOracle: readerOracle,
    readerAsset2: readerAsset2,
    readerOracle2: readerOracle2
  }
}

async function validatePriceAndAnchor(priceOracle, asset, expectedPriceMantissa, expectedAnchorMantissa, expectedPendingAnchor = 0) {
  const actualPriceMantissa = await priceOracle.methods.getPrice(asset._address).call();

  assert.equal(actualPriceMantissa, expectedPriceMantissa, 'money market price mantissa');

  const actualAnchor = await priceOracle.methods.anchors(asset._address).call();
  assert.equal(actualAnchor.priceMantissa, expectedAnchorMantissa, 'oracle anchor price mantissa');

  await verifyPendingAnchor(priceOracle, asset, expectedPendingAnchor);
}

async function verifyPendingAnchor(priceOracle, asset, pendingAnchorMantissa) {

  assert.equal(await priceOracle.methods.pendingAnchors(asset._address).call(), pendingAnchorMantissa, "pending anchor");
}

async function setPendingAnchor(priceOracle, asset, pendingAnchorMantissa, anchorAdmin) {
  const result = await priceOracle.methods._setPendingAnchor(asset._address, pendingAnchorMantissa).send({from: anchorAdmin});
  assert.oracleSuccess(result);
  await verifyPendingAnchor(priceOracle, asset, pendingAnchorMantissa);
}

// Use this for setup when your test is for a non-initial price
async function setInitialPrice(priceOracle, asset, priceMantissa, poster) {
  const [errorCode, _tx, _error] = await readAndExecContract(priceOracle, 'setPrice', [asset._address, priceMantissa], {from: poster});
  assert.noOracleError(errorCode);

  await validatePriceAndAnchor(priceOracle, asset, priceMantissa, priceMantissa);
}

module.exports = {
  setInitialPrice,
  setPendingAnchor,
  setupPricingContracts,
  setupPricingHarnessContracts,
  setupPricingContractsWithMultipleAssets,
  validatePriceAndAnchor
}
