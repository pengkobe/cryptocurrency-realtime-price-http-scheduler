const Koa = require('koa');
const startTask = require('./schedule');

const app = new Koa();

app.on('error', (err, ctx) => {
    console.log('ctx: ', ctx);
    ctx.status = 401
    ctx.body = err.message
});

app.listen(7007, () => {
    startTask();
    console.log('server start');
});