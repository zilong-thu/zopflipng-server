const fs    = require('fs');
const Koa   = require('koa');
const glob  = require("glob");
const serve = require('koa-static');
const nunjucks = require('nunjucks');


const app = new Koa();
nunjucks.configure({
  noCache: true,
});


// Array: ['./src/page/activity/citySetup/assets/coupon_p1.png', ...]
let files = glob.sync('./src/**/*.png');
files = files.map(item => ({
  img: item.replace('./src', ''),
  filename: item,
  stats: fs.statSync(item),
}));

app.use(serve('./src'));

app.use(async ctx => {
  const res = nunjucks.render('./compress-png.html', { files });
  ctx.body = res;
});

app.listen(8079);
console.log('serving at http://localhost:8079/');
