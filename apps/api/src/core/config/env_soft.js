export function validateEnvSoft() {
    let warnings = [];

    if (!process.env.TREASURY_ADDRESS) {
        warnings.push("Missing TREASURY_ADDRESS");
    }

    if (!process.env.NODEOPS_API_KEY) {
        warnings.push("Missing NODEOPS_API_KEY");
    }

    if (warnings.length > 0) {
        console.warn("\n[ENV WARNINGS]");
        warnings.forEach(w => console.warn(`- ${w}`));
        console.warn("\n");
    }

    return warnings;
}
