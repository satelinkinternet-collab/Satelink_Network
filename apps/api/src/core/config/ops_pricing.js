export const opsPricing = {
    rpc_call: 0.0005,
    ai_inference: 0.01,
    webhook_delivery: 0.0003,
    automation_job: 0.002,
    data_processing: 0.005
};

export function getOpsPrice(opType) {
    const price = opsPricing[opType];
    return price !== undefined ? price : 0.001; // default arbitrary fallback price
}
