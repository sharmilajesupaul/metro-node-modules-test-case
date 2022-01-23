# UPDATE: Fixed in https://github.com/facebook/metro/commit/9bbe219809c2bdfdb949e825817e2522e099ff9f


## Metro doesn't respect transitive NPM packages dependencies in nodeModulesPaths directories

## Explanation

This is a repo illustrating a bug in node_modules resolution using the latest version of metro & the `nodeModulesPaths` flag with additional `watchFolders` to specify a `node_modules` directory outside of the project-root.

When you have an npm package that is a root level dependency as well as a downstream dependency of another package, metro will always resolve to the package at the root level.

The directory structure of the repo looks like this:

```sh
❯ tree
.
├── README.md
├── custom_node_modules # an external directory with packages
│   ├── package-a
│   │   ├── index.js # requires package-b at a different version than the root custom_node_modules/package-b
│   │   ├── node_modules
│   │   │   ├── package-b # the version of package-b that should be used when required in package-a/index.js
│   │   │   │   ├── index.js
│   │   │   │   └── package.json
│   │   │   └── package-c # control to show another package that doesn't have this issue
│   │   │       ├── index.js
│   │   │       └── package.json
│   │   └── package.json
│   └── package-b # the version of package-b at the root of the tree that metro uses, even when resolving package-a/index.js
│       ├── index.js
│       └── package.json
└── project-root
    ├── index.js # the build entry file that requires package-a
    ├── metro.config.js
    ├── package.json
    └── yarn.lock

7 directories, 14 files
```

The metro metro configuration `project-root/metro.config.js` specifies additional `watchFolders` & `nodeModulesPaths`:

```js
// ...
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
```

## Setup

Run `cd project-root; yarn` to install dependencies. Note that the examples below all run from inside `project-root`.

## Example using NODE_PATH

To recreate this example run: `cd project-root; yarn run nodePathExample`.

You should see output similar to the code block below:

```sh
$ NODE_PATH='../custom_node_modules' node index.js
Using package-c...
package-c
Using package-b v1.0.0...
package-b version1Api # API from inside custom_node_modules/package-a/node_modules/package-b/index.js is used
✨  Done in 0.21s.
```

## Example after building via Metro

To recreate this example run: `cd project-root; yarn run metroBuildExample`.

You should see output similar to the code block below:

```sh
# ...
 BUNDLE  ./index.js ░░░░░░░░░░░░░░░░ 0.0% (0/1)Writing bundle output to: index.build.js
Done writing bundle output
 BUNDLE  ./index.js

Using package-c...
package-c
Using package-b v1.0.0...  # throws when attempting to use package-b v1.0.0
Error:  TypeError: o.version1Api is not a function
    at /Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:4:154
    at _ (/Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:2:1579)
    at d (/Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:2:1048)
    at i (/Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:2:502)
    at /Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:3:42
    at _ (/Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:2:1579)
    at d (/Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:2:1048)
    at i (/Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:2:502)
    at Object.<anonymous> (/Users/sharmila_jesupaul/airlab/repos/metro-node-modules-test-case/project-root/index.build.js:7:1)
    at Module._compile (internal/modules/cjs/loader.js:1156:30)
Using package-b 2.0.0... # can correctly resolve v2.0.0
package-b version2Api
✨  Done in 1.58s.
```

Notice how in the above example, Metro does not resolve package-b to version 1.0.0 (from inside `package-a/node_modules/package-b`) the way that NodeJS does when use `NODE_PATH`. Instead, metro bundles `project-root/index.js` with the root `package-b` at the incorrect version 2.0.0.

Maintaining his hierarchy in package resolution specificity is especially important in larger repositories where you could have many duplications inside of packages required by downstream dependencies.

The way that I came across this was a mismatch in the `ts-invariant` package which was required by our required version of `@apollo/client@3.4` at `v0.9.3`. But the root `node_modules` had `ts-invariant@0.4.4`. The `@apollo/client` package goes on to call `setVerbosity` which fails throws an error, since `setVerbosity` was introduced in the newer version of `ts-invariant` that `@apollo/client@3.4` had an explicit dependency on.
