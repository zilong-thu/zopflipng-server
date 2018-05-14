const fs       = require('fs');
const path     = require('path');
const Koa      = require('koa');
const glob     = require("glob");
const serve    = require('koa-static');
const nunjucks = require('nunjucks');
const Router   = require('koa-router');
const bodyParser = require('koa-bodyparser');
const util     = require('util');
const exec     = util.promisify(require('child_process').exec);
const mkdirp   = require('mkdirp');


const app = new Koa();
app.use(bodyParser());
nunjucks.configure({
  noCache: true,
});

const ImageRoot  = '../qcs.fe.activity/src';
const targetRoot = './static/compressed';

// Array: ['{ImageRoot}/page/activity/citySetup/assets/coupon_p1.png', ...]
function getAllFiles() {
  let files = glob.sync(`${ImageRoot}/**/*.png`);
  files = files.map(item => ({
    img: item.replace(ImageRoot, ''),
    filename: item,
    stats: fs.statSync(item),
    filePath: path.resolve(item),
  }));

  files.forEach(item => {
    const t = targetRoot + item.img;
    if (fs.existsSync(t)) {
      item.compressed = {
        url: t.replace('./static', ''),
        stats: fs.statSync(t),
      };
    } else {
      item.compressed = null;
    }
  });

  // const resFiles = glob.sync(`${targetRoot}/**/*.png`);
  // console.log(resFiles);
  return files;
}

app.use(serve(ImageRoot));
app.use(serve('./static'));

var router = new Router();


router.get('/api/images', async ctx => {
  ctx.body = {
    data: getAllFiles(),
  };
});

// 压缩单张图片
router.post('/api/compress-img', async (ctx, next) => {
  const file = ctx.request.body.filePath;
  // 原图的绝对路径
  const fileAbsolutePath = path.resolve(ImageRoot + file);

  // 目标文件夹
  const targetDir = './static/compressed' + path.dirname(file);
  mkdirp.sync(targetDir);
  const targetFile = './static/compressed' + file;

  try {
    fs.unlinkSync(targetFile);
  } catch(err) {

  }

  const cmdDesc = `zop ${fileAbsolutePath} ${targetFile}`;
  console.log('执行命令：', cmdDesc);
  const res = await exec(cmdDesc);
  // console.log(res);
  ctx.body = {
    success: true,
    message: res,
    data: {
      url: targetFile.replace('./static', ''),
      stats: fs.statSync(targetFile),
    }
  };
});

app.use(router.routes())
  .use(router.allowedMethods());

app.use(async ctx => {
  const res = nunjucks.render('./template.html', { files: getAllFiles() });
  ctx.body = res;
});

app.listen(8079);
console.log('serving at http://localhost:8079/');
