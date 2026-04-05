import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

describe("Satelink Integration", function () {
    let provider;
    let owner;
    let node1;
    let registry;
    let distributor;

    before(async function () {
        const connection = await hre.network.connect();
        provider = new ethers.BrowserProvider(connection.provider);

        const signers = await provider.listAccounts();
        owner = await provider.getSigner(signers[0].address);
        node1 = await provider.getSigner(signers[1].address);

        // Deploy Registry
        const registryArtifactPath = path.resolve(
            "artifacts/contracts/NodeRegistryV2.sol/NodeRegistryV2.json"
        );
        const registryArtifact = JSON.parse(fs.readFileSync(registryArtifactPath, "utf8"));
        const RegistryFactory = new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode, owner);
        registry = await RegistryFactory.deploy();
        await registry.waitForDeployment();

        // Deploy Distributor
        const distributorArtifactPath = path.resolve(
            "artifacts/contracts/RevenueDistributor.sol/RevenueDistributor.json"
        );
        const distributorArtifact = JSON.parse(fs.readFileSync(distributorArtifactPath, "utf8"));
        const DistributorFactory = new ethers.ContractFactory(distributorArtifact.abi, distributorArtifact.bytecode, owner);
        distributor = await DistributorFactory.deploy(await registry.getAddress());
        await distributor.waitForDeployment();
    });

    it("should register a node", async function () {
        const tx = await registry.connect(owner).registerNode(node1.address);
        await tx.wait();

        const count = await registry.nodeCount();
        expect(count).to.equal(1n);

        const [wallet, active] = await registry.getNode(0);
        expect(wallet).to.equal(node1.address);
        expect(active).to.equal(true);
    });

    it("should distribute revenue (event verification)", async function () {
        const payout = ethers.parseEther("1.0");

        const tx = await distributor.connect(owner).distribute(0, { value: payout });
        const receipt = await tx.wait();

        console.log("Checking logs...");
        let found = false;
        for (const log of receipt.logs) {
            // Ethers v6 automatically parses logs if ABI is known by the Contract object
            // So log is likely an EventLog
            if (log.fragment && log.fragment.name === "Distributed") {
                console.log("Found Distributed event:", log.args);
                expect(log.args[0]).to.equal(0n); // nodeId
                expect(log.args[1]).to.equal(node1.address); // wallet
                expect(log.args[2]).to.equal(payout); // amount
                found = true;
                break;
            } else {
                console.log("Other log:", log);
            }
        }
        expect(found).to.be.true;
    });
});
