"use strict";

const fs = require('fs');
const path = require('path');
const Immutable = require('seamless-immutable');
const Web3_ = require('web3');

function getNetworkFile(network) {
  if (process.env.NETWORKS_FOLDER) {
    return `${process.env.NETWORKS_FOLDER}/${network}.json`;
  } else {
    return path.join(__dirname, '..', '..', 'networks', `${network}.json`);
  }
}

function loadNetworkConfig(network) {
  const networkFile = getNetworkFile(network);
  let contents = "{}"; // default

  try {
    contents = fs.readFileSync(networkFile, 'UTF8');
  } catch (e) {
    // File read error, ignore
  }

  return Immutable(JSON.parse(contents));
}

function save(network, key, value) {
  const networkFile = getNetworkFile(network);
  const currentNetworkConfig = loadNetworkConfig(network);
  const updated = Immutable.setIn(currentNetworkConfig, key, value);

  fs.writeFileSync(networkFile, JSON.stringify(updated, null, 4));
}

function load(network) {
  return loadNetworkConfig(network);
}

function deploy(deployer, network, contract, args=[], givenContractName=undefined) {
  const web3 = new Web3_(deployer.provider);
  const contractName = givenContractName || contract._json.contractName;

  console.log(`Deploying ${contractName} with ${args}...`);
  return deployer.deploy(contract, ...args).then(async (deployed) => {
    const trx = await web3.eth.getTransaction(deployed.transactionHash);

    save(network, ["Contracts", contractName], deployed.address);
    save(network, ["Blocks", contractName], trx.blockNumber);
    save(`${network}-abi`, [contractName], deployed.abi);
    console.log(`Deployed ${contractName} at ${deployed.address}.`);

    return deployed.address;
  });
}

function deployNew(network, contract, args=[], saveAddress=true, saveABI=true, tag="", contractName=null) {
  if (contractName === null) {
    contractName = contract._json.contractName;
  }

  console.log(`Deploying new ${contractName}${tag}...`);
  return contract.new.apply(null, args).then((deployed) => {
    if (saveAddress) {
      save(network, ["Contracts", contractName], deployed.address);
    }

    if (saveABI) {
      save(`${network}-abi`, [contractName], deployed.abi);
    }

    console.log(`Deployed new ${contractName} at ${deployed.address}${tag}.`);

    return deployed;
  });
}

function getDeployedAddress(network, contractName) {
  let info = load(network);
  return info["Contracts"][contractName];
}

module.exports = {
  deploy,
  deployNew,
  getDeployedAddress,
  load,
  save,
};
