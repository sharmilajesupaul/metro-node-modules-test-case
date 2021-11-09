const path = require('path');
const projectRoot =  path.resolve(__dirname);
module.exports = {
  projectRoot,
  resolver: {
    nodeModulesPaths: ['../custom_node_modules'],
  },
  watchFolders: [
    projectRoot, 
    path.resolve(__dirname, '..', 'custom_node_modules'),
  ],
}