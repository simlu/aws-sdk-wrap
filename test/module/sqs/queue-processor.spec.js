const expect = require('chai').expect;
const { describe } = require('node-tdd');
const index = require('../../../src/index');

describe('Testing QueueProcessor', {
  useNock: true,
  record: console,
  envVarsFile: 'config.env.yml'
}, () => {
  let aws;
  let processor;
  let executor;
  before(() => {
    aws = index({ logger: console });
    processor = aws.sqs.QueueProcessor({
      queueUrl: process.env.QUEUE_URL,
      stepsDir: `${__filename}_steps`
    });
    executor = (records) => new Promise((resolve, reject) => {
      processor({
        Records: records.map((r) => ({ body: JSON.stringify(r) }))
      }, {}, (err, resp) => {
        if (err !== null) {
          reject(err);
        } else {
          resolve(resp);
        }
      });
    });
  });

  it('Testing step1 -> [step2]', async () => {
    const result = await executor([{ name: 'step1' }]);
    expect(result).to.deep.equal([{ name: 'step1' }]);
  });

  it('Testing step2 -> []', async () => {
    const result = await executor([{ name: 'step2' }]);
    expect(result).to.deep.equal([{ name: 'step2' }]);
  });

  it('Testing bad-output', async ({ capture }) => {
    const result = await capture(() => executor([{ name: 'bad-output' }]));
    expect(result.message).to.equal(
      'Unexpected/Invalid next step(s) returned for: bad-output '
      + '[\n  {\n    "name" \u001b[31m[1]\u001b[0m: "unknown-step"\n  }\n]'
      + '\n\u001b[31m\n[1] "[0].name" must be [step2]\u001b[0m'
    );
  });

  it('Testing disallowed-output', async ({ capture }) => {
    const result = await capture(() => executor([{ name: 'disallowed-output' }]));
    expect(result.message).to.equal('No output allowed for step: disallowed-output');
  });

  it('Testing unknown-step', async ({ capture }) => {
    const result = await capture(() => executor([{ name: 'unknown-step' }]));
    expect(result.message).to.equal('Invalid step provided: unknown-step');
  });

  it('Testing unnamed-step', async ({ capture }) => {
    const result = await capture(() => executor([{}]));
    expect(result.message).to.equal('Received step event that is missing "name" property.');
  });

  it('Testing invalid event format', async ({ capture }) => {
    const result = await capture(() => executor([['element']]));
    expect(result.message).to.equal('Invalid Event Received: ["element"]');
  });

  it('Testing invalid step payload', async ({ capture }) => {
    const result = await capture(() => executor([{ name: 'step1', unexpected: 'value' }]));
    expect(result.message).to.equal(
      'Invalid payload received for step: step1 '
      + '{\n  "name": "step1",\n  "unexpected" \u001b[31m[1]\u001b[0m: "value"\n}\n\u001b[31m\n'
      + '[1] "unexpected" is not allowed\u001b[0m'
    );
  });

  it('Testing multiple records', async ({ capture }) => {
    const result = await capture(() => executor([{ name: 'step1' }, { name: 'step1' }]));
    expect(result.message).to.equal(
      'Lambda SQS subscription is mis-configured! '
      + 'Please only process one event at a time for retry resilience.'
    );
  });
});