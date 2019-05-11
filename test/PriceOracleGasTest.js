"use strict";

const {getContract} = require('./Contract');
const EIP20 = getContract("./test/EIP20Harness.sol");
const {gas, getExpMantissa} = require('./Utils');
require('./PriceOracleUtils');
const {
  setupPricingContracts,
  setupPricingContractsWithMultipleAssets
} = require('./PriceOracleTestHelpers');

const PriceOracle = getContract("./PriceOracle.sol");

contract('PriceOracle', function ([root, ...accounts]) {
  const anchorAdmin = accounts[1];
  const poster = accounts[2];

  async function setupForMultiPriceTest(numAssets, includeReader=false) {
    const {priceOracle, assets} = await setupPricingContractsWithMultipleAssets(anchorAdmin, poster, root, numAssets, includeReader);

    const assetAddresses = assets.map(a => a._address);
    const prices = Array(numAssets).fill().map((_, i) => getExpMantissa((i + 1) * 0.1));

    return {
      priceOracle: priceOracle,
      assets: assets,
      assetAddresses: assetAddresses,
      prices: prices
    }
  }

  describe("gas test / setPrice", async () => {

    it("sets a non-initial price for expected gas cost @gas", async () => {
      const {priceOracle, asset} = await setupPricingContracts(anchorAdmin, poster, root);

      await priceOracle.methods.setPrice(asset._address, getExpMantissa(0.5)).send({from: poster});

      // for second update use a different price that is in max swing range
      const second = await priceOracle.methods.setPrice(asset._address, getExpMantissa(0.55)).send({from: poster});

      // const gasEstimatedFromOpCodes = 36083;
      // non-initial: reads 8, writes 0, updates 1, calls 1
      const otherOps = 7583; // total from opcodes not already estimated as gas.transaction, gas.storage_new, gas.storage_read, or gas.call
      const unknownGas = 5000;
      const expectedSecondGas = unknownGas + otherOps + gas.transaction + gas.storage_update + (7 * gas.storage_read);
      console.log(`setPrice: expectedSecondGas=${expectedSecondGas}, result.gasUsed=${second.gasUsed}, delta=${expectedSecondGas - second.gasUsed}`);

      assert.withinGas(second, expectedSecondGas, 5000, "non-initial update should cost about 41k gas", true);
    });
  });

  describe('gas test / getPrice', async () => {
    it('without reader @gas', async () => {
      const numAssets = 2;
      const {priceOracle, assetAddresses, prices} = await setupForMultiPriceTest(numAssets, false);

      await priceOracle.methods.setPrices(assetAddresses, prices).send({from: poster});

      const normalAssetA = await priceOracle.methods.getPrice(assetAddresses[0]).send({from: poster});
      const normalAssetB = await priceOracle.methods.getPrice(assetAddresses[1]).send({from: poster});

      // estimates: non-initial: reads 2, writes 0, calls 0
      const expectedGas = 2 * gas.storage_read + 3000;

      assert.withinGas(normalAssetA, expectedGas, 1000, "setPrices 1 update should cost correct gas");
      assert.withinGas(normalAssetB, expectedGas, 1000, "setPrices 1 update should cost correct gas");
    });

    it('with reader @gas', async () => {
      const numAssets = 2;
      const {priceOracle, assetAddresses, prices} = await setupForMultiPriceTest(numAssets, true);

      await priceOracle.methods.setPrices(assetAddresses, prices).send({from: poster});

      const normalAssetA = await priceOracle.methods.getPrice(assetAddresses[0]).send({from: poster});
      const readerAssetB = await priceOracle.methods.getPrice(assetAddresses[1]).send({from: poster});

      // estimates: reader: reads 3, writes 0, calls 1
      const expectedGasNormal = 2 * gas.storage_read + 3000;
      const expectedGasReader = gas.call + 3 * gas.storage_read + 4000;

      assert.withinGas(normalAssetA, expectedGasNormal, 1000, "setPrices 1 update should cost correct gas");
      assert.withinGas(readerAssetB, expectedGasReader, 1000, "setPrices 1 update should cost correct gas");
    });
  });

  describe("gas test / setPrices", async () => {

    it("sets 1 non-initial prices for expected gas cost @gas", async () => {
      const numAssets = 1;
      const {priceOracle, assetAddresses, prices} = await setupForMultiPriceTest(numAssets);

      await priceOracle.methods.setPrices(assetAddresses, prices).send({from: poster});
      // for second update use different prices that are in max swing range
      const newPrices = prices.map(p => p * 1.02);
      const second = await priceOracle.methods.setPrices(assetAddresses, newPrices).send({from: poster});

      // estimates: non-initial: reads 8, writes 0, updates 1, calls 1
      // const gasEstimatedFromOpCodes = 37440; shows 10 reads; 2 (aka 400 gas) more than expected
      const otherOps = 10340; // total from opcodes not estimated as gas.transaction, gas.storage_new, gas.storage_read, or gas.call
      const unknownGas = 1000;
      const expectedSecondGas = unknownGas + gas.transaction + gas.storage_read + otherOps + (numAssets * (gas.storage_update + (7 * gas.storage_read)));

      assert.withinGas(second, expectedSecondGas, 1000, "setPrices 1 update should cost about 42k", true);
    });

    it("sets 5 non-initial prices for expected gas cost @gas", async () => {
      const numAssets = 5;
      const {priceOracle, assetAddresses, prices} = await setupForMultiPriceTest(numAssets);

      await priceOracle.methods.setPrices(assetAddresses, prices).send({from: poster});
      // for second update use different prices that are in max swing range
      const newPrices = prices.map(p => p * 1.02);
      const second = await priceOracle.methods.setPrices(assetAddresses, newPrices).send({from: poster});

      // estimates: non-initial 1 read and then per asset: reads 8, writes 0, updates 1, calls 1
      // const gasEstimatedFromOpCodes = 98068; shows 46 reads; 10 (aka 2000 gas) more than expected 36 (1 + 5*7)
      const otherOps = 44368; // total from opcodes not estimated as gas.transaction, gas.storage_new, gas.storage_read, or gas.call
      const unknownGas = 6000;
      const expectedSecondGas = unknownGas + gas.transaction + gas.storage_read + otherOps + (numAssets * (gas.storage_update + (7 * gas.storage_read)));

      assert.withinGas(second, expectedSecondGas, 1000, "setPrices with 5 updates should cost about 118k", true);
    });

    it("sets 10 non-initial prices for expected gas cost @gas", async () => {
      const numAssets = 10;
      const {priceOracle, assetAddresses, prices} = await setupForMultiPriceTest(numAssets);

      await priceOracle.methods.setPrices(assetAddresses, prices).send({from: poster});
      // for second update use different prices that are in max swing range
      const newPrices = prices.map(p => p * 1.02);
      const second = await priceOracle.methods.setPrices(assetAddresses, newPrices).send({from: poster});

      // estimates: non-initial 1 read and then per asset: reads 8, writes 0, updates 1, calls 1
      // const gasEstimatedFromOpCodes = 173853; shows 91 reads; 20 (aka 4000 gas) more than expected 71 ( 1 + 10*7)
      const otherOps = 87653; // total from opcodes not estimated as gas.transaction, gas.storage_new, gas.storage_read, or gas.call
      const unknownGas = 11000;
      const expectedSecondGas = unknownGas + gas.transaction + gas.storage_read + otherOps + (numAssets * (gas.storage_update + (7 * gas.storage_read)));

      assert.withinGas(second, expectedSecondGas, 5000, "setPrices with 10 updates should cost about 214k", true);
    });
  });
});

