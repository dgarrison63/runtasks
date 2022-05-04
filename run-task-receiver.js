// const https = require('https');
// const http = require('http');
const axios = require('axios');
const jsonQuery = require('json-query');
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

async function getPlanOutput(body, url, token) {
//  return 'failed';
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  await axios
    .get(url, config)
    .then((res) => {
      console.log(`statusCode: ${res.status}`);
      // const myArray = res.data.resource_changes;
      const planArray = res.data;
      //      console.log(planArray);
      const queryResult = jsonQuery('resource_changes[type=bigip_as3].change', {
        data: planArray,
      }).value;
      console.log('VALUE OF AS3 QUERY IS: ', queryResult);

      if (queryResult == null) {
        console.log('RETURNING FAILED RESPONSE');
        return 'failed';
      }
      console.log('RETURNING PASSED RESPONSE');

      return 'passed';
      /*
      terraform_result = jsonQuery('after.as3json', {
        data: query_result,
      });
      console.log(terraform_result);

      //       console.log(res.data)
      //       console.log(res.data.format_version)
      //       console.log(res.data.resource_changes[0])
      console.log(res.data.resource_changes[0].change);

      /*
        for (let i=0; i < myarray.length; i++) {
            console.log(myarray[i].type)
        }
*/
    })
    .catch((error) => {
      console.error(error);
    });
}

async function postCallback(body, url, token, planStatus) {
  console.log('PLAN RESULT', `${planStatus}`);
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
        status: `${planStatus}`,
        message: 'Hello task',
        url: 'http://runtasks.ngrok.io',
      },
    },
  };
  await axios
    .patch(url, payload, config)
    .then((res) => {
      console.log(`statusCode: ${res.status}`);
      //    console.log(res);
    })
    .catch((error) => {
      console.error(error);
    });
}

router.all('/', (ctx) => {
  const { body } = ctx.request;
  // console.log('This is the request body...', body);
  console.log('This is the plan output url...', body.plan_json_api_url);
  const planOutputURL = body.plan_json_api_url;
  const apiToken = body.access_token;
  const callbackURL = body.task_result_callback_url;
  // logRequest(ctx);
  const result = getPlanOutput(body, planOutputURL, apiToken);
  console.log('THIS IS THE RESULT FROM PLAN OUTPUT...', result);
  postCallback(body, callbackURL, apiToken, result);

  ctx.status = 200;
  // console.log(ctx.response);
  ctx.body = 'got it!';
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080);
