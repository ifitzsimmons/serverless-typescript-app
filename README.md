# serverless-typescript-app

# `tsconfig.json` Options
* `"sourceMap": true`: This setting will map the transpiled Node lines of code back to the TypeScript lines of code. Useful for debugging
* `target` and `lib`: Tells TypeScript transpiler how to transpile code to node.
* `"resolveJsonModule": true`: Carries over code structure to the build directory
* `include`: tells transpiler which files to transpile
* `exclude`: tells transpiler files and folders to exclude
* `allowJs`: "transpiles" plain JavaScript code in case there are any JS files

# package.json
* `build`: removes old build directories and transpiles TS
* `build-deploy`: builds typescript and then calls `sls deploy`
* `deploy`: deploys app from the `build` directory.
