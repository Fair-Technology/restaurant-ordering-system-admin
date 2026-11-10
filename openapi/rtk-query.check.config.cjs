// Same as rtk-query.config.cjs but writes to a sibling temp file (so relative imports match) so the committed client can be diffed against it.
const base = require('./rtk-query.config.cjs');

/** @type {import('@rtk-query/codegen-openapi').ConfigFile} */
module.exports = { ...base, outputFile: '../src/services/api.gen.check.ts' };
