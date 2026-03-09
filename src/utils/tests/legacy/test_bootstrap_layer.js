import { BootstrapLayer } from '../../../execution/bootstrap_layer.js';

const db = {
    prepare: (query) => {
        return {
            get: (param) => {
                // Since this runs before migration, we will simulate it throwing an error
                // to test the catch block and default behavior
                throw new Error("no such table: node_capabilities");
            }
        };
    }
};

async function test() {
    const layer = new BootstrapLayer(db);
    const result = await layer.guaranteeExecutionCapacity('ethereum');
    console.log(result);
}

test();
