import os

server_path = '/Users/pradeepjakuraa/satelink-mvp/server.js'

with open(server_path, 'r') as f:
    lines = f.readlines()

new_lines = []
imports_added = False
mounts_added = False

# Imports to add
new_imports = [
    'import { createAdminApiRouter } from "./src/routes/admin_api_v2.js";\n',
    'import { createNodeApiRouter } from "./src/routes/node_api_v2.js";\n',
    'import { createBuilderApiV2Router } from "./src/routes/builder_api_v2.js";\n',
    'import { createDistApiRouter } from "./src/routes/dist_api_v2.js";\n',
    'import { createEntApiRouter } from "./src/routes/ent_api_v2.js";\n'
]

# Filter out existing buggy/partial lines
cleaned_lines = []
for line in lines:
    if 'import { createAdminApiRouter }' in line: continue
    if 'import { createNodeApiRouter }' in line: continue
    if 'import { createBuilderApiV2Router }' in line: continue
    if 'import { createDistApiRouter }' in line: continue
    if 'import { createEntApiRouter }' in line: continue
    
    if 'createAdminApiRouter(opsEngine)' in line: continue
    if 'app.use(\'/admin-api\'' in line: continue
    
    if 'createNodeApiRouter(opsEngine)' in line: continue
    if 'app.use(\'/node-api\'' in line: continue

    if 'createBuilderApiV2Router(opsEngine)' in line: continue
    if 'app.use(\'/builder-api\'' in line: continue
    
    if 'createDistApiRouter(opsEngine)' in line: continue
    if 'app.use(\'/dist-api\'' in line: continue

    if 'createEntApiRouter(opsEngine)' in line: continue
    if 'app.use(\'/ent-api\'' in line: continue
    
    cleaned_lines.append(line)

# Reconstruct
for i, line in enumerate(cleaned_lines):
    new_lines.append(line)
    
    # Inject imports after last import
    if line.strip().startswith('import') and not imports_added:
        # Check if next line is not import
        next_line = cleaned_lines[i+1] if i+1 < len(cleaned_lines) else ''
        if not next_line.strip().startswith('import'):
            new_lines.extend(new_imports)
            imports_added = True

    # Inject mounts before Integration Router
    if '// 8) Mount Integration Router' in line and not mounts_added:
        # Insert BEFORE this line
        new_lines.pop() # Remove the line we just added to re-add it after mounts
        
        new_lines.append('  // --- Dashboard V2 API Routers ---\n')
        new_lines.append('  app.use(\'/admin-api\', createAdminApiRouter(opsEngine));\n')
        new_lines.append('  app.use(\'/node-api\', createNodeApiRouter(opsEngine));\n')
        new_lines.append('  app.use(\'/builder-api\', builderAuthRouter.verifyBuilder, createBuilderApiV2Router(opsEngine));\n')
        new_lines.append('  app.use(\'/dist-api\', builderAuthRouter.verifyBuilder, createDistApiRouter(opsEngine));\n')
        new_lines.append('  app.use(\'/ent-api\', builderAuthRouter.verifyBuilder, createEntApiRouter(opsEngine));\n')
        new_lines.append('\n')
        new_lines.append(line) # Add the integration router line back
        mounts_added = True

with open(server_path, 'w') as f:
    f.writelines(new_lines)

print("Successfully patched server.js")
