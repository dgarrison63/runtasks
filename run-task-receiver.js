// const https = require('https');

// const http = require('http');

const axios = require('axios');
// const jsonQuery = require('json-query');
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const jsonQuery = require('json-query');
const AJV = require('ajv');
const fs = require('fs');
// const res = require('express/lib/response');

const app = new Koa();
const router = new Router();
const ajv = new AJV({ strict: false });

async function getPlanOutput(body, url, token) {
//  return 'failed';
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  const planOutput = await axios
    .get(url, config)
    .then((res) => {
      console.log(`statusCode: ${res.status}`);
      return res.data;
    })
    .catch((error) => {
      console.error('GOT AN AXIOS ERROR IN getPlanOutput', error);
    });
  return planOutput;
}

async function postCallback(body, url, token, planStatus, message) {
  console.log('PLAN STATUS IN CALLBACK FUNCTION', planStatus);
  console.log('PlAN MESSAGE IN CALLBACK FUNCTION', message);
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.api+json',
    },
  };
  const payload = {
    data: {
      type: 'task-results',
      attributes: {
        status: 'passed',
        message: `${message}`,
        url: 'http://runtasks.ngrok.io',
      },
    },
  };
  await axios
    .patch(url, payload, config)
    .then((res) => {
      console.log(`statusCode: ${res.status}`);
      return res.data;
    })
    .catch((error) => {
      console.error('GOT AN AXIOS ERROR IN postCallback', error);
    });
}

function processAS3Payload(planOutput) {
  console.log('IN PROCESSAS3 FUNCTION PLAN OUTPUT', planOutput);
  const queryResult = jsonQuery('resource_changes[type=bigip_as3].change', {
    data: planOutput,
  }).value;
  console.log('VALUE OF AS3 QUERY IS: ', queryResult);
  const as3schema = fs.readFile('schemas/as3Schema.json', (error, data) => {
    const valid = ajv.validate(queryResult);
    console.log('RESULT FROM AJV IS: ', valid);
  });
  console.log('SCHEMA', as3schema);
  return ['passsed', 'THIS MESSAGE IS FROM AS3 VALIDATOR\nCAN I HAVE MULTIPLE LINES?'];
}

router.all('/', async (ctx) => {
  const { body } = ctx.request;
  let result;
  let message;
  // console.log('This is the request body...', body);
  console.log('This is the plan output url...', body.plan_json_api_url);
  const planOutputURL = body.plan_json_api_url;
  const apiToken = body.access_token;
  const callbackURL = body.task_result_callback_url;
  console.log('REQUEST URL ', ctx.url);
  // logRequest(ctx);()
  const planOutput = await getPlanOutput(body, planOutputURL, apiToken);
  console.log('FORMAT VERSION: ', planOutput.format_version);
  console.log('THIS IS THE RESULT FROM PLAN OUTPUT...', planOutput);
  if (ctx.url != null) {
    [result, message] = processAS3Payload(planOutput);
  }

  postCallback(body, callbackURL, apiToken, result, message);

  ctx.status = 200;
  // console.log(ctx.response);
  ctx.body = 'got it!';
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080);
