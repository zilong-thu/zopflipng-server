// jquery
// axios

$('.list-group').on('click', 'button[data-src]', function() {
  var $btn = $(this);
  var $targetEle = $($btn.closest('.row').find('.col-sm-6')[1]);
  $targetEle.html(`
    <div class="progress">
      <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div>
    </div>
  `);

  var filePath = $btn.data('src');
  console.log(filePath);
  axios.post('/api/compress-img', {
    filePath: filePath
  }).then(res => {
    var body = res.data;
    $targetEle.html(`
      <img src="${body.data.url}" />
      <div>${body.data.stats.size} bytes</div>
    `);
  });
});
