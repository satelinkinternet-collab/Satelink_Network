export const rpcProvidersMap = {
    ethereum: [
        "community_nodes",
        "genesis_nodes",
        "infura",
        "alchemy",
        "quicknode"
    ],
    polygon: [
        "community_nodes",
        "genesis_nodes",
        "infura",
        "alchemy"
    ],
    amoy: [
        "polygon_amoy_public"
    ],
    solana: [
        "community_nodes",
        "quicknode",
        "alchemy"
    ]
};

export const externalEndpoints = {
    infura: "https://mainnet.infura.io/v3/SATELINK_INTERNAL",
    alchemy: "https://eth-mainnet.g.alchemy.com/v2/SATELINK_INTERNAL",
    quicknode: "https://mainnet.quiknode.pro/SATELINK_INTERNAL/",
    polygon_amoy_public: process.env.CHAIN_RPC_AMOY || "https://rpc-amoy.polygon.technology"
};
