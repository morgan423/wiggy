// Expo dans un monorepo npm workspaces : Metro ne remonte pas au-delà du
// projet par défaut. Sans ça, @wiggy/core et les paquets hoistés à la racine
// sont introuvables au bundling.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// Une seule copie de chaque dépendance : deux React dans le bundle = écran blanc.
config.resolver.disableHierarchicalLookup = true

module.exports = config
