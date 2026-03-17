import express from 'express';
import listEndpoints from 'express-list-endpoints';
import { createAdminApiRouter } from "../../../gateway/routes/admin_api_v2.js";
import { createNodeApiRouter } from "../../../gateway/routes/node_api_v2.js";

const app = express();
app.use('/admin-api', createAdminApiRouter({}, {}));
app.use('/api', createNodeApiRouter({}));

console.log(listEndpoints(app));
