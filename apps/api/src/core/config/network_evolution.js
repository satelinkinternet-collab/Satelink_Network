export const NetworkEvolutionStages = {
    INITIAL: {
        id: 'STAGE_INITIAL',
        description: 'Network bootstrap phase requiring high genesis infrastructure.',
        distribution: {
            communityNodes: 0,
            genesisNodes: 70,
            externalProviders: 30
        }
    },
    GROWTH: {
        id: 'STAGE_GROWTH',
        description: 'Network growth phase transitioning toward community infrastructure.',
        distribution: {
            communityNodes: 50,
            genesisNodes: 30,
            externalProviders: 20
        }
    },
    MATURE: {
        id: 'STAGE_MATURE',
        description: 'Mature decentralized network with high community self-sustainability.',
        distribution: {
            communityNodes: 80,
            genesisNodes: 15,
            externalProviders: 5
        }
    }
};

/**
 * getCurrentEvolutionStage returns the active stage configuration.
 * Eventually this can be driven dynamically by total active registered nodes
 * or a governable DB parameter.
 */
export function getCurrentEvolutionStage(communityNodeCount = 0) {
    if (communityNodeCount >= 100) {
        return NetworkEvolutionStages.MATURE;
    } else if (communityNodeCount >= 20) {
        return NetworkEvolutionStages.GROWTH;
    } else {
        return NetworkEvolutionStages.INITIAL;
    }
}
