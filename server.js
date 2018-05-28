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
  try {
    const res = fs.statSync(file);
    res.sizeDesc = humanizeNum(res.size);
    return res;
  } catch(e) {
    return {};
  }
}

function humanizeNum(size = 0) {
  return Math.round(size / 1024) + 'KB';
}

const md5 = crypto.createHash('md5');
const TargetDirHash = md5.update(path.resolve(ImageRoot)).digest('hex');
// 本地文件夹目录
const targetRoot = './compressed/' + TargetDirHash;

// Array: ['{ImageRoot}/page/activity/citySetup/assets/coupon_p1.png', ...]
function getAllFiles() {
  let files = glob.sync(`${ImageRoot}/**/*.png`);
  files = files.map(item => ({
    img: item.replace(ImageRoot, ''),
    filename: item,
    stats: statsAFile(item),
    filePath: path.resolve(item),
  }));

  // 已压缩的图片
  let numberOfCompressedImages = 0;
  // 原始图片的总体积
  let totalSize = 0;
  // 压缩过的图片总体积
  let totalSizeAfter = 0;
  // 未压缩的图片的总体积
  let sizeOfUncompressedImages = 0;

  files.forEach(item => {
    const t = targetRoot + item.img;
    totalSize += item.stats.size;
    if (fs.existsSync(t)) {
      item.compressed = {
        url: t.replace('./compressed', ''),
        stats: statsAFile(t),
      };

      const oldSize = item.stats.size;
      const newSize = item.compressed.stats.size;
      totalSizeAfter += newSize;

      item.sizeSaveRatio = Math.round(newSize / oldSize * 100);

      numberOfCompressedImages++;
    } else {
      item.compressed = null;
      sizeOfUncompressedImages += item.stats.size;
    }
  });

  // const resFiles = glob.sync(`${targetRoot}/**/*.png`);
  // console.log(resFiles);
  return {
    files,
    numberOfCompressedImages,
    sizeOfUncompressedImages,
    totalSize,
    totalSizeAfter,
  };
}

app.use(serve(ImageRoot));
app.use(serve('./static'));
app.use(serve('./compressed'));

var router = new Router();


router.get('/api/images', async ctx => {
  const all = getAllFiles();
  ctx.body = {
    data: all.files,
  }
});

function compressOneImage(file) {
  // 原图的绝对路径
  const fileAbsolutePath = path.resolve(ImageRoot + file);

  // 目标文件夹
  const targetDir = './compressed/' + TargetDirHash + path.dirname(file);
  mkdirp.sync(targetDir);
  const targetFile = './compressed/' + TargetDirHash + file;

  try {
    fs.unlinkSync(targetFile);
  } catch(err) {

  }

  const cmdDesc = `zop ${fileAbsolutePath} ${targetFile}`;
  console.log('执行命令：', cmdDesc);
  return exec(cmdDesc).catch(err => err);
}

// 压缩单张图片
router.post('/api/compress-img', async (ctx, next) => {
  // "/part-3/chapter-6-vue/vue-logo.png"
  const file = ctx.request.body.filePath;
  const res = await compressOneImage(file);

  const targetFile = './compressed/' + TargetDirHash + file;

  ctx.body = {
    success: true,
    message: res,
    data: {
      url: targetFile.replace('./compressed', ''),
      stats: statsAFile(targetFile),
    }
  };
});


// 仅压缩未压缩的图片
router.post('/api/compress/uncompressed', async (ctx, next) => {
  const all = getAllFiles();
  const unCompressedImages = all.files.filter(item => !item.compressed);
  unCompressedImages.forEach(item => {
    compressOneImage(item.img);
  });

  ctx.body = {
    success: true,
    message: '正在压缩，请随时刷新页面',
  };
});


// 替换一张图片
router.post('/api/replace', async ctx => {
  const file = ctx.request.body.filePath;
  console.log(file);
  const filePath = ImageRoot + file;

  try {
    fs.unlinkSync(filePath);
    fs.copyFileSync(targetRoot + file, filePath);
    ctx.body = {
      success: true,
    };
  } catch(err) {
    ctx.body = {
      success: false,
      error: err,
    };
  }
});

app.use(router.routes())
  .use(router.allowedMethods());

app.use(async ctx => {
  const allFiles = getAllFiles();
  const res = nunjucks.render('./template.html', {
    ...allFiles,
    totalSizeDesc: humanizeNum(allFiles.totalSize),
    totalSizeAfterDesc: humanizeNum(allFiles.totalSizeAfter),
    sizeOfUncompressedImagesDesc: humanizeNum(allFiles.sizeOfUncompressedImages),
    workingDir: path.resolve(ImageRoot),
    compressedDir: path.resolve(targetRoot),
  });
  ctx.body = res;
});

app.listen(8079);
console.log('serving at http://localhost:8079/');
