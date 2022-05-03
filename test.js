const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

router.all('/', (ctx, next) => {
  // ctx.router available
  console.log('THIS IS CTX: ', ctx.request.body);
  ctx.response.status = 200;
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080);
