import os

server_path = '/Users/pradeepjakuraa/satelink-mvp/server.js'

with open(server_path, 'r') as f:
    lines = f.readlines()

new_lines = []
dashboard_routers_removed = False

for line in lines:
    # 1. Update Import
    if 'import { createUnifiedAuthRouter } from "./src/routes/auth_v2.js";' in line:
        new_lines.append('import { createUnifiedAuthRouter, verifyJWT } from "./src/routes/auth_v2.js";\n')
        continue
    
    # 2. Skip old dashboard mounts to replace them
    if '// --- Dashboard V2 API Routers ---' in line:
        dashboard_routers_removed = True
        continue
    
    if dashboard_routers_removed:
        # Skip lines until we hit the integration router mount or empty lines end
        # My previous patch added 6 lines + comment
        if 'createAdminApiRouter(opsEngine)' in line: continue
        if 'createNodeApiRouter(opsEngine)' in line: continue
        if 'createBuilderApiV2Router(opsEngine)' in line: continue
        if 'createDistApiRouter(opsEngine)' in line: continue
        if 'createEntApiRouter(opsEngine)' in line: continue
        
        # Stop skipping when we see the next section
        if '// 8) Mount Integration Router' in line:
            dashboard_routers_removed = False
            # Now inject the secured block
            new_lines.append('  // --- Dashboard V2 API Routers ---\n')
            new_lines.append('  app.use(\'/admin-api\', verifyJWT, createAdminApiRouter(opsEngine));\n')
            new_lines.append('  app.use(\'/node-api\', verifyJWT, createNodeApiRouter(opsEngine));\n')
            new_lines.append('  app.use(\'/builder-api\', verifyJWT, createBuilderApiV2Router(opsEngine));\n')
            new_lines.append('  app.use(\'/dist-api\', verifyJWT, createDistApiRouter(opsEngine));\n')
            new_lines.append('  app.use(\'/ent-api\', verifyJWT, createEntApiRouter(opsEngine));\n')
            new_lines.append('\n')
            new_lines.append(line) # Add the integration router line back
            continue
        
        if line.strip() == '': continue # Skip empty lines in the block
        
    new_lines.append(line)

with open(server_path, 'w') as f:
    f.writelines(new_lines)

print("Successfully applied security patch to server.js")
