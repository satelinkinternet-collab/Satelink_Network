console.log("Global hre keys:");
console.log(Object.keys(global.hre || {}));
console.log("ethers available?:", !!(global.hre && global.hre.ethers));
