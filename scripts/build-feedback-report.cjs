// 从本轮 Markdown 交付记录生成可离线打开、可打印的报告。
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(
  root,
  'docs/releases/2026-09-16-report-second-batch.md'
);
const destination = path.resolve(
  root,
  '../linkinfra/output/LinkInfra-新一轮意见落实报告-2026-09-16.html'
);
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );
const inline = (value) =>
  escape(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const lines = fs.readFileSync(source, 'utf8').split(/\r?\n/);
let html = '',
  list = '',
  table = false;
function closeList() {
  if (list) html += `</${list}>`;
  list = '';
}
function closeTable() {
  if (table) html += '</tbody></table></div>';
  table = false;
}
for (const line of lines) {
  if (line.startsWith('|')) {
    closeList();
    if (/^\|[\s:|-]+\|$/.test(line)) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((v) => v.trim());
    if (!table) {
      html +=
        '<div class="table-wrap"><table><thead><tr>' +
        cells.map((c) => `<th scope="col">${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>';
      table = true;
    } else
      html +=
        '<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
    continue;
  }
  closeTable();
  const item = line.match(/^(- |\d+\. )(.*)/);
  if (item) {
    const type = item[1] === '- ' ? 'ul' : 'ol';
    if (type !== list) {
      closeList();
      html += `<${type}>`;
      list = type;
    }
    html += `<li>${inline(item[2])}</li>`;
    continue;
  }
  closeList();
  if (!line.trim()) continue;
  const heading = line.match(/^(#{1,2}) (.*)/);
  html += heading
    ? `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`
    : `<p>${inline(line)}</p>`;
}
closeTable();
closeList();
const shots = [
  ['keys-desktop.png', '密钥页：管理入口、地址和列表'],
  ['models-1366.png', '模型广场：固定筛选、搜索和分页'],
  ['models-320.png', '320px 模型广场'],
  ['client-320.png', '320px 客户端配置弹窗'],
  ['home-desktop.png', '精简后的首页'],
  ['home-mobile.png', '移动端首页']
]
  .map(
    ([file, label]) =>
      `<details><summary>${label}</summary><img loading="lazy" src="data:image/png;base64,${fs
        .readFileSync(path.join(root, 'design-mockups/review-2026-09-16', file))
        .toString('base64')}" alt="${label}（模拟数据）"></details>`
  )
  .join('');
const document = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LinkInfra · 新一轮意见落实报告 · 2026-09-16</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f4fa;color:#222330;font:15px/1.8 system-ui,'Microsoft YaHei',sans-serif}header{background:#251940;color:white;padding:32px max(20px,calc((100vw - 1100px)/2));border-bottom:4px solid #946af5}header b{letter-spacing:2px;font-size:13px}header p{margin:8px 0;color:#ddd2f5}.badge{display:inline-block;padding:3px 12px;border:1px solid #84709e;border-radius:20px;font-size:12px;margin-right:8px}main{max-width:1140px;margin:28px auto;padding:30px;background:#fff;border:1px solid #e6e1ef;border-radius:16px}h1{font-size:28px;line-height:1.4;margin:0 0 20px}h2{font-size:21px;margin:36px 0 14px;color:#6037c0}p{margin:10px 0}code{font:12px/1.6 ui-monospace,monospace;overflow-wrap:anywhere;background:#f4f2f8;padding:2px 4px;border-radius:4px}li{margin:8px 0}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;background:#f2ecff;color:#573695}td,th{padding:12px;border-bottom:1px solid #e7e3ed;vertical-align:top}td:first-child{white-space:nowrap;font-weight:600}td:nth-child(2){min-width:180px}td:nth-child(3){min-width:340px}button{font:inherit;cursor:pointer;background:#7347eb;color:#fff;border:0;border-radius:8px;padding:8px 18px;margin-top:16px}button:focus-visible,summary:focus-visible{outline:3px solid #946af5;outline-offset:3px}details{border:1px solid #e5dfef;border-radius:10px;margin:12px 0;padding:12px}summary{cursor:pointer;color:#6037c0;font-weight:600}img{display:block;max-width:100%;height:auto;margin:16px auto}footer{max-width:1100px;margin:20px auto 40px;padding:0 20px;color:#686372;font-size:13px}@media(max-width:640px){main{margin:12px;padding:18px}h1{font-size:23px}header{padding:24px 20px}}@media print{@page{margin:14mm}body,main{background:white}header,button,details,footer{display:none}main{margin:0;border:0;padding:0;max-width:none}h1{font-size:22px}h2{break-after:avoid}.table-wrap{overflow:visible}td:nth-child(2),td:nth-child(3){min-width:0}table{font-size:10px}td,th{padding:7px}tr{break-inside:avoid}code{font-size:10px}}
</style></head><body><header><b>LINKINFRA · 意见落实与验收</b><p>2026-09-16 · 对应新版《debug记录》</p><span class="badge">本地实现 · 未部署</span><span class="badge">20 条逐项对应（含营销补充）</span><br><button onclick="window.print()">打印 / 保存 PDF</button></header><main>${html}<h2>页面验证截图</h2><p>以下为本地模拟接口与账户数据，仅用于布局和交互验收。点击展开。</p>${shots}</main><footer>本文件内置截图与样式，可独立离线打开。打印默认只输出文字记录。来源：docs/releases/2026-09-16-report-second-batch.md</footer></body></html>`;
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, document, 'utf8');
console.log(destination);
