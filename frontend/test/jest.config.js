module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports',
      filename: 'report.html',
      expand: true,
    }],
  ],
  collectCoverage: true,
  coverageDirectory: './coverage',
  testResultsProcessor: './test/test-reporter.ts',
};