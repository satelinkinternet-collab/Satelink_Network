sudo chown -R $(whoami) ~/.npm || true
sudo rm -rf node_modules package-lock.json || true
npm cache clean --force || true
npm install
