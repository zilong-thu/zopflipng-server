/**
 * 依赖的全局变量
 *   - jquery
 *   - axios
 */

$('.list-group').on('click', 'button[data-src]', function() {
  var $btn = $(this);
  var filePath = $btn.data('src');

  compressImage(filePath, $btn);
});

async function compressImage(filePath, $btn) {
  if (!$btn) {
    $btn = $('button[data-src="' + filePath + '"]');
  }

  var $targetEle = $($btn.closest('.row').find('.col-sm-6')[1]);
  $targetEle.html(`
    <div class="progress">
      <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div>
    </div>
  `);

  console.log(filePath);
  return axios.post('/api/compress-img', {
    filePath: filePath
  }).then(res => {
    var body = res.data;
    $targetEle.html(`
      <img src="${body.data.url}" />
      <div>${body.data.stats.sizeDesc}</div>
    `);
  }).catch(err => {
    toast.alert({
      title: '出错了',
      text: JSON.stringify(err.stack),
    });
  });
}


/**
 * 压缩全部图片
 */
$('#compress-all').click(function() {
  axios.get('/api/images').then(res => {
    var list = res.data.data;
    list.forEach(async item => {
      var res = await compressImage(item.img);
    });
  });
});

$('#compress-uncompressed').click(function() {
  axios.post('/api/compress/uncompressed').then(res => {
    toast.message({
      text: res.data.message,
      type: 'success',
      autoHide: true,
    });
  });
})