/** @type {import('@rtk-query/codegen-openapi').ConfigFile} */
module.exports = {
  schemaFile: './swagger.json',
  apiFile: '../src/services/baseApi.ts',
  apiImport: 'baseApi',
  outputFile: '../src/services/api.ts',
  exportName: 'api',
  tag: true,
  hooks: { queries: true, lazyQueries: true, mutations: true },
};
