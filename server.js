const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const Koa        = require('koa');
const glob       = require("glob");
const serve      = require('koa-static');
const nunjucks   = require('nunjucks');
const Router     = require('koa-router');
const bodyParser = require('koa-bodyparser');
const util       = require('util');
const mkdirp     = require('mkdirp');
const exec       = util.promisify(require('child_process').exec);

const app = new Koa();
app.use(bodyParser());
nunjucks.configure({
  noCache: true,
});

const args = process.argv;
// 要被压缩的目录
let ImageRoot = '../qcs.fe.activity/src';
if (args.length === 3) {
  ImageRoot = args[2];
}

function statsAFile(file) {
  const res = fs.statSync(file);
  res.sizeDesc = Math.round(res.size / 1024) + 'KB';
  return res;
}

const md5 = crypto.createHash('md5');
const targetDirHash = md5.update(path.resolve(ImageRoot)).digest('hex');
// 本地文件夹目录
const targetRoot = './compressed/' + targetDirHash;

// Array: ['{ImageRoot}/page/activity/citySetup/assets/coupon_p1.png', ...]
function getAllFiles() {
  let files = glob.sync(`${ImageRoot}/**/*.png`);
  files = files.map(item => ({
    img: item.replace(ImageRoot, ''),
    filename: item,
    stats: statsAFile(item),
    filePath: path.resolve(item),
  }));

  files.forEach(item => {
    const t = targetRoot + item.img;
    if (fs.existsSync(t)) {
      item.compressed = {
        url: t.replace('./compressed', ''),
        stats: statsAFile(t),
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
app.use(serve('./compressed'));

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
  const targetDir = './compressed/' + targetDirHash + path.dirname(file);
  mkdirp.sync(targetDir);
  const targetFile = './compressed/' + targetDirHash + file;

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
      url: targetFile.replace('./compressed', ''),
      stats: statsAFile(targetFile),
    }
  };
});

app.use(router.routes())
  .use(router.allowedMethods());

app.use(async ctx => {
  const res = nunjucks.render('./template.html', {
    files: getAllFiles(),
    workingDir: path.resolve(ImageRoot),
    compressedDir: path.resolve(targetRoot),
  });
  ctx.body = res;
});

app.listen(8079);
console.log('serving at http://localhost:8079/');
