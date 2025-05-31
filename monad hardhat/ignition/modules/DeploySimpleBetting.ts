import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SimpleBettingModule = buildModule("SimpleBettingModule", (m) => {
  // Get the contract to deploy. Hardhat Ignition automatically finds your contract
  // in the `contracts` directory, compiles it, and gets its artifact.
  const simpleBetting = m.contract("SimpleBetting");


  console.log("Deploying SimpleBetting...");

  return { simpleBetting };
});

export default SimpleBettingModule; 