"use strict";

const fs   = require("fs");
const glob = require("glob");
const os   = require("os");

module.exports = class Next2DWebpackAutoLoaderPlugin
{
    /**
     * @param {string} [env=local]
     * @param {object} [options=null]
     */
    constructor (env = "local", options = null)
    {
        /**
         * @type {string}
         * @default local
         * @private
         */
        this._$env = env;

        /**
         * @type {Object}
         * @default null
         * @private
         */
        this._$options = options;

        /**
         * @type {string}
         * @private
         */
        this._$cacheJson = "";

        /**
         * @type {string}
         * @private
         */
        this._$cachePackages = "";
    }

    /**
     * @param   {Compiler} compiler
     * @returns {void}
     */
    apply (compiler)
    {
        compiler.hooks.beforeCompile.tapAsync("Next2DWebpackAutoLoaderPlugin", (compilation, callback) =>
        {
            const dir = compilation.normalModuleFactory.context;

            const config = {
                "stage"  : {},
                "routing": {}
            };

            const configPath = `${dir}/src/config/config.json`;
            if (fs.existsSync(configPath)) {

                const envJson = JSON.parse(
                    fs.readFileSync(configPath, { "encoding": "utf8" })
                );

                if (this._$env in envJson) {
                    Object.assign(config, envJson[this._$env]);
                }

                if (envJson.all) {
                    Object.assign(config, envJson.all);
                }
            }

            const stagePath = `${dir}/src/config/stage.json`;
            if (fs.existsSync(stagePath)) {

                const stageJson = JSON.parse(
                    fs.readFileSync(stagePath, { "encoding": "utf8" })
                );

                Object.assign(config.stage, stageJson);
            }

            const routingPath = `${dir}/src/config/routing.json`;
            if (fs.existsSync(routingPath)) {

                const routingJson = JSON.parse(
                    fs.readFileSync(routingPath, { "encoding": "utf8" })
                );

                Object.assign(config.routing, routingJson);
            }

            const json = JSON.stringify(config, null, 4);
            if (this._$cacheJson !== json) {
                // cache
                this._$cacheJson = json;

                fs.writeFileSync(
                    `${dir}/src/config/Config.js`,
                    `const config = ${JSON.stringify(config, null, 4)};${os.EOL}export { config };`
                );
            }

            glob(`${dir}/src/**/*.js`, (err, files) =>
            {
                if (err) {
                    throw err;
                }

                let imports = "";
                let packages = `[${os.EOL}`;
                files.forEach((file) =>
                {
                    const js = fs.readFileSync(file, { "encoding": "utf-8" });
                    const lines = js.split("\n");

                    lines.forEach((line) =>
                    {
                        if (line.startsWith("export class ")) {

                            const name = line.split(" ")[2];
                            switch (true) {

                                case file.indexOf("src/view/") > -1:
                                    imports  += `import { ${name} } from "/src/${file.split("src/")[1].split(".js")[0]}";${os.EOL}`;
                                    packages += `["${name}", ${name}],${os.EOL}`;
                                    break;

                                case file.indexOf("src/model/") > -1:
                                    {
                                        const key = file
                                            .split("src/model/")[1]
                                            .split("/")
                                            .join(".")
                                            .slice(0, -3);

                                        const asName = file
                                            .split("src/model/")[1]
                                            .split("/")
                                            .join("_")
                                            .slice(0, -3);

                                        imports  += `import { ${name} as ${asName} } from "/src/${file.split("src/")[1]}";${os.EOL}`;
                                        packages += `["${key}", ${asName}],${os.EOL}`;
                                    }
                                    break;

                                default:
                                    break;

                            }
                        }
                    });
                });

                packages = packages.slice(0, -2);
                packages += `${os.EOL}]`;

                const value = `${imports}const packages=${packages};${os.EOL}export { packages };`;
                if (this._$cachePackages !== value) {
                    // cache
                    this._$cachePackages = value;
                    fs.writeFileSync(`${dir}/src/Packages.js`, value);
                }
            });

            callback();
        });

        const outputPath = compiler.options.output.path;
        if (compiler.options.mode === "production") {

            const options = this._$options;
            compiler.hooks.afterEmit.tap("Next2DWebpackAutoLoaderPlugin", (compilation) =>
            {
                glob(`${outputPath}/*`, (err, files) =>
                {
                    if (err) {
                        throw err;
                    }

                    const filename = compilation.options.output.filename;
                    files.forEach((file) =>
                    {
                        if (file.indexOf(filename) > -1
                            && !options.LICENSE
                            && file.indexOf(`${filename}.LICENSE.txt`) > -1
                        ) {

                            fs.unlink(file, (err) => {
                                if (err) {
                                    throw err;
                                }
                            });

                        }
                    });
                });
            });
        }

        if (!fs.existsSync(`${outputPath}/index.html`)) {

            if (!fs.existsSync(`${outputPath}`)) {
                fs.mkdirSync(`${outputPath}`);
            }

            fs.writeFileSync(
                `${outputPath}/index.html`,
                `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Next2D | Env | ${this._$env}</title>
    <script src="/app.js"></script>
</head>
<body style="margin: 0; padding: 0;">
</body>
</html>`);

        }
    }
};
