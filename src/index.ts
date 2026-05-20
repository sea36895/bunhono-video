import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { XMLParser } from 'fast-xml-parser';

interface Config {
  site: { name: string; domain: string; email: string };
  apis: Array<{ name: string; url: string }>;
  videoParser: string;
  templateName: string;
  sortDesc: string;
  showTimeLimit: string;
  seo: {
    title: { list: string; search: string; info: string };
    keywords: { list: string; search: string; info: string };
    description: { list: string; search: string; info: string };
  };
}

interface Video {
  id?: any;
  name?: any;
  pic?: any;
  year?: any;
  last?: any;
  director?: any;
  actor?: any;
  type?: any;
  area?: any;
  des?: any;
  tid?: any;
  dl?: any;
}

function getTextValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    if ('#text' in value) return String(value['#text']);
    if ('#cdata-section' in value) return String(value['#cdata-section']);
    for (const key in value) {
      if (key.startsWith('#')) return String(value[key]);
    }
    const keys = Object.keys(value);
    if (keys.length === 1) return getTextValue(value[keys[0]]);
    return JSON.stringify(value);
  }
  return String(value);
}

const app = new Hono();
const config: Config = await Bun.file('./config.json').json();

app.use('*', logger());
app.use('*', cors());

function generateRandomChineseIP(): string {
  const ipRanges = [
    ['607649792', '608174079'],
    ['1038614528', '1039007743'],
    ['1783627776', '1784676351'],
    ['2035023872', '2035154943'],
    ['2078801920', '2079064063'],
    ['-1950089216', '-1948778497'],
    ['-1425539072', '-1425014785'],
    ['-1236271104', '-1235419137'],
    ['-770113536', '-768606209'],
    ['-569376768', '-564133889']
  ];
  const randKey = Math.floor(Math.random() * ipRanges.length);
  const [start, end] = ipRanges[randKey];
  const ipNum = Math.floor(Math.random() * (parseInt(end) - parseInt(start) + 1)) + parseInt(start);
  return long2ip(ipNum);
}

function long2ip(long: number): string {
  const a = (long & 0xff000000) >> 24;
  const b = (long & 0x00ff0000) >> 16;
  const c = (long & 0x0000ff00) >> 8;
  const d = long & 0x000000ff;
  return `${a & 0xff}.${b & 0xff}.${c & 0xff}.${d & 0xff}`;
}

async function fetchAPI(url: string, userAgent: string = 'Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/537.36'): Promise<string | null> {
  const ips = generateRandomChineseIP();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Forwarded-For': ips,
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip'
      }
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    console.error('API请求失败:', e);
    return null;
  }
}

function parseXML(xmlStr: string): any {
  try {
    let xml = xmlStr;
    xml = xml.replace(/<script(.*?)<\/script>|<span[^>]*?>|<\/span>|<p\s[^>]*?>|<p>|<\/p>/gi, '');
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      allowBooleanAttributes: true,
      parseAttributeValue: true,
      parseTagValue: true,
      cdataTagName: '#text',
      textNodeName: '#text'
    });
    return parser.parse(xml);
  } catch (e) {
    console.error('XML解析失败:', e);
    return null;
  }
}

async function handleDataCache(
  sort: 'category' | 'info' | 'search' | 'list',
  id: string,
  page: number,
  apiUrl: string,
  showTimeLimit: string,
  sortDesc: string
): Promise<{ data: any; pagecount: number; xml: string }> {
  let actualPage = page;
  let requestUrl = '';

  let xmlPageContent = '';
  
  switch (sort) {
    case 'category':
      // 使用 ac=list 获取分类
      requestUrl = `${apiUrl}?ac=list`;
      break;
    case 'info':
      requestUrl = `${apiUrl}?ac=videolist&ids=${id}${showTimeLimit}`;
      break;
    case 'search':
      requestUrl = `${apiUrl}?ac=videolist&wd=${encodeURIComponent(id)}&pg=${page}${showTimeLimit}`;
      break;
    case 'list':
      const pageUrl = `${apiUrl}?ac=videolist&t=${id}&pg=${page}${showTimeLimit}`;
      const pageContent = await fetchAPI(pageUrl);
      xmlPageContent = pageContent || '';
      let pageCount = 1;
      if (pageContent) {
        const match = pageContent.match(/pagecount="(\d+)"/);
        pageCount = match ? parseInt(match[1]) : 1;
      }
      if (sortDesc === 'yes') {
        actualPage = pageCount - page + 1;
      }
      requestUrl = `${apiUrl}?ac=videolist&t=${id}&pg=${actualPage}${showTimeLimit}`;
      break;
  }

  const remoteData = await fetchAPI(requestUrl);
  if (!remoteData) return { data: [], pagecount: 1, xml: '' };
  
  let pagecount = 1;
  if (remoteData) {
    const match = remoteData.match(/pagecount="(\d+)"/);
    pagecount = match ? parseInt(match[1]) : 1;
  }
  if (xmlPageContent) {
    const match = xmlPageContent.match(/pagecount="(\d+)"/);
    pagecount = match ? parseInt(match[1]) : pagecount;
  }

  if (sort === 'category') {
    // 正确解析 ac=list 返回的分类数据
    const xmlData = parseXML(remoteData);
    const categories: Array<{ 分类号: string; 分类名: string }> = [{ 分类号: '', 分类名: '首页' }];
    
    // 尝试从不同路径获取分类
    let typesArray: any[] = [];
    
    if (xmlData?.rss?.class?.ty) {
      typesArray = Array.isArray(xmlData.rss.class.ty) ? xmlData.rss.class.ty : [xmlData.rss.class.ty];
    } else if (xmlData?.class?.ty) {
      typesArray = Array.isArray(xmlData.class.ty) ? xmlData.class.ty : [xmlData.class.ty];
    }
    
    for (const ty of typesArray) {
      let cateId = '';
      let cateName = '';
      
      if (typeof ty === 'object') {
        cateId = ty['@id'] || ty['@attributes']?.id || '';
        cateName = ty['#text'] || ty['#cdata-section'] || ty['name'] || '';
        if (typeof cateName === 'object') {
          cateName = getTextValue(cateName);
        }
      } else {
        cateName = String(ty);
      }
      
      if (cateId && cateName && cateName !== 'undefined' && cateName.trim()) {
        categories.push({
          分类号: String(cateId),
          分类名: cateName.trim()
        });
      }
    }
    
    // 如果还是没有分类，尝试从视频列表中提取
    if (categories.length === 1 && xmlData?.rss?.list?.video) {
      const typeMap = new Map<string, string>();
      const videos = Array.isArray(xmlData.rss.list.video) ? xmlData.rss.list.video : [xmlData.rss.list.video];
      
      for (const video of videos) {
        const tid = String(video.tid || '');
        const typeName = getTextValue(video.type);
        if (tid && typeName && !typeMap.has(tid)) {
          typeMap.set(tid, typeName);
        }
      }
      
      const sortedTypes = Array.from(typeMap.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      for (const [tid, name] of sortedTypes) {
        categories.push({ 分类号: tid, 分类名: name });
      }
    }
    
    return { data: categories, pagecount: 1, xml: remoteData };
  } else {
    const xmlData = parseXML(remoteData);
    if (!xmlData) return { data: [], pagecount: 1, xml: remoteData };
    return { data: xmlData, pagecount, xml: remoteData };
  }
}

function buildPageUrl(c: any, sort: string, id: string = '', page: number = 1): string {
  const url = new URL(c.req.url);
  const params = new URLSearchParams();
  switch (sort) {
    case 'list':
      if (id) params.set('sort', id);
      params.set('page', page.toString());
      break;
    case 'search':
      params.set('key', id);
      params.set('page', page.toString());
      break;
    case 'info':
      params.set('info', id);
      break;
  }
  return `${url.origin}${url.pathname}?${params.toString()}`;
}

app.use('/public/*', serveStatic({ root: './' }));

app.get('/', async (c) => {
  const infoId = c.req.query('info') || null;
  const searchKey = c.req.query('key') || null;
  const sortId = c.req.query('sort') || null;
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  
  const cookieHeader = c.req.header('cookie') || '';
  const apiFromCookie = cookieHeader.split(';').find(c => c.trim().startsWith('api_select='))?.split('=')[1] || '1';
  let apiSelect = c.req.query('api') || apiFromCookie;
  if (!/^\d+$/.test(apiSelect) || parseInt(apiSelect) < 1) apiSelect = '1';

  let pageType: 'list' | 'info' | 'search' = 'list';
  let uniqueId = sortId || '';
  if (infoId) {
    pageType = 'info';
    uniqueId = infoId;
  } else if (searchKey) {
    pageType = 'search';
    uniqueId = decodeURIComponent(searchKey);
  }

  const defaultApi = config.apis[0];
  const apiIndex = parseInt(apiSelect) - 1;
  const currentApi = config.apis[apiIndex] || defaultApi;

  const categoriesResult = await handleDataCache('category', '', 1, currentApi.url, config.showTimeLimit, config.sortDesc);
  const videoResult = await handleDataCache(pageType, uniqueId, page, currentApi.url, config.showTimeLimit, config.sortDesc);
  const categories = categoriesResult.data;
  const videoData = videoResult.data;

  let videoInfo: Video = {};
  let videoList: Video[] = [];
  let playerScript = '';

  if (pageType === 'info') {
    if (videoData?.rss?.list?.video) {
      videoInfo = Array.isArray(videoData.rss.list.video) ? videoData.rss.list.video[0] : videoData.rss.list.video;
    }
    if (!videoInfo.dl) videoInfo.dl = { dd: [] };

    // 正确处理 dd 数据
    const ddList: any[] = [];
    const dlData = videoInfo.dl?.dd;
    
    if (Array.isArray(dlData)) {
      ddList.push(...dlData);
    } else if (dlData) {
      ddList.push(dlData);
    }
    
    // 构建用于前端的 bflist 结构 - 只保留m3u8源
    const bfList: any = { dd: [] };
    for (const item of ddList) {
      if (typeof item === 'object' && item['@flag']) {
        if (item['@flag'].toLowerCase().includes('m3u8')) {
          bfList.dd.push(item);
        }
      }
    }
    
    // 生成播放列表脚本
    playerScript = `<script>var bflist=${JSON.stringify(bfList)};var jx='${config.videoParser}';function bf(str){document.getElementById("iframe").style.display="block";document.getElementById("frame").src=jx+str;}if(Array.isArray(bflist['dd'])){var viddz=bflist['dd'];}else{var viddz=new Array(bflist['dd']);}var bfmoban=document.getElementById("playlist").innerHTML;document.getElementById("playlist").innerHTML='';for(var i in viddz){var rawText = viddz[i]['#text'] || viddz[i];var episodes = rawText.split("#");var zyname = viddz[i]['@flag'] || 'yun';document.getElementById("playlist").innerHTML+=bfmoban.replace(/资源加载中/g,zyname);var jjmoban=document.getElementById("zylx"+zyname).innerHTML;var bfnr='';for(var k=0;k<episodes.length;k++){var epParts = episodes[k].split("$");var epTitle = epParts[0] || '';var epUrl = epParts[1] || '';if(epTitle && epUrl){bfnr+=jjmoban.replace(/剧集加载中/g,epTitle).replace(/剧集地址加载中/g,epUrl);}}document.getElementById("zylx"+zyname).innerHTML=bfnr;}</script>`;
  } else {
    if (videoData?.rss?.list?.video) {
      videoList = Array.isArray(videoData.rss.list.video) ? videoData.rss.list.video : [videoData.rss.list.video];
    }
  }

  let pagination = { current: page, prev: 1, next: 1, last: 1, first: '' };
  pagination.last = videoResult.pagecount || 1;
  pagination.prev = Math.max(1, page - 1);
  pagination.next = Math.min(pagination.last, page + 1);

  const seoData = {
    CURRENT_CATEGORY: '最近更新',
    SEARCH_KEYWORD: '',
    VIDEO_NAME: ''
  };

  if (pageType === 'search') {
    seoData.SEARCH_KEYWORD = uniqueId;
  }
  if (pageType === 'list') {
    for (const cate of categories) {
      if (cate['分类号'] === uniqueId) {
        seoData.CURRENT_CATEGORY = cate['分类名'];
        break;
      }
    }
  }
  if (pageType === 'info') {
    seoData.VIDEO_NAME = getTextValue(videoInfo.name);
  }

  c.header('Set-Cookie', `api_select=${apiSelect}; Path=/; Max-Age=${86400 * 30}`);

  return c.html(renderTemplate(c, {
    config,
    pageType,
    apiSelect,
    currentApi,
    categories,
    videoList,
    videoInfo,
    playerScript,
    pagination,
    seoData
  }));
});

function renderTemplate(c: any, data: any) {
  const { config, pageType, apiSelect, currentApi, categories, videoList, videoInfo, playerScript, pagination, seoData } = data;
  const baseUrl = new URL(c.req.url).origin;

  let content = '';
  if (pageType === 'info') {
    content = renderInfoPage(c, videoInfo, playerScript, baseUrl);
  } else if (pageType === 'search') {
    content = renderListPage(c, videoList, seoData.SEARCH_KEYWORD, pagination, baseUrl, true);
  } else {
    content = renderListPage(c, videoList, seoData.CURRENT_CATEGORY, pagination, baseUrl, false);
  }

  return `<!DOCTYPE html>
<html lang="zh-cn">
<head>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no" />
<meta name="applicable-device" content="pc,mobile">
<title>${seoData.CURRENT_CATEGORY} - ${config.site.name}</title>
<meta name="keywords" content="${seoData.CURRENT_CATEGORY},最新电影,最新电视,最新综艺,最新动漫" />
<meta name="description" content="${config.site.name}提供最新的电影、电视、综艺、动漫在线播放服务">
<script src="https://apps.bdimg.com/libs/jquery/2.1.4/jquery.min.js"></script>
<script src="https://lib.baomitu.com/jquery.lazyload/1.9.1/jquery.lazyload.min.js"></script>
<script>
function changeApi() {
  var apiId = document.getElementById('api-selector').value;
  document.cookie = 'api_select=' + apiId + '; path=/; max-age=' + (86400 * 30);
  var url = new URL(window.location.href);
  url.searchParams.delete('api');
  url.searchParams.delete('page');
  window.location.href = url.toString();
}
document.addEventListener('DOMContentLoaded', function() {
  var selector = document.getElementById('api-selector');
  if (selector) {
    var currentApi = getCookie('api_select') || '1';
    selector.value = currentApi;
  }
});
function getCookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return '';
}
</script>
<link rel="stylesheet" href="/public/default/css/home.css">
<link rel="stylesheet" rev="stylesheet" type="text/css" media="all" href="/public/default/css/style.css">
</head>
<body id="body">
<header>
  <div class="head">
    <div class="logo"><a href="${baseUrl}">${config.site.name}</a></div>
    <div class="api-select">
      <select id="api-selector" onchange="changeApi()">
        ${config.apis.map((api: any, idx: number) => `<option value="${idx + 1}" ${idx + 1 === parseInt(apiSelect) ? 'selected' : ''}>${api.name}</option>`).join('')}
      </select>
    </div>
    <div class="search-box">
      <form name="formsearch" id="formsearch" action="${baseUrl}" method="get" autocomplete="off">
        <input type="text" id="searchword" name="key" class="search-input" placeholder="搜索视频" />
        <input type="submit" id="searchbutton" class="search-button" value="搜索">
      </form>
    </div>
  </div>
  <nav class="navbar">
    <div class="nav-container"> 
      <ul class="menu">
        ${categories.map((cat: any) => `<li><a href="${baseUrl}?sort=${cat['分类号']}">${cat['分类名']}</a></li>`).join('')}
      </ul>
    </div>
  </nav>
</header>
${content}
<footer class="footer">
  <p>本网站提供的最新电视剧和电影资源均系收集于各大视频网站本网站只提供web页面服务并不提供影片资源存储也不参与录制上传</p>
  <p>若本站收录的节目无意侵犯了贵司版权，请给邮箱${config.site.email}，我们会在3个工作日内删除侵权内容，谢谢。</p>
  <p>友情提示：请勿长时间观看影视，注意保护视力并预防近视，合理安排时间，享受健康生活。</p>
</footer>
</body>
</html>`;
}

function renderListPage(c: any, videoList: Video[], title: string, pagination: any, baseUrl: string, isSearch: boolean) {
  return `
<section class="main-container">
  <div class="row-five">
    <div class="box-title"><b>${title}列表</b></div>
    <div class="box-body"> 
      ${videoList.map(video => `
      <div class="box-item">
        <a class="item-link" href="${baseUrl}?info=${getTextValue(video.id)}" title="${getTextValue(video.name)}">
          <img src="${getTextValue(video.pic) || 'https://placehold.co/200x280?text=No+Image'}" alt="${getTextValue(video.name)}">
          <button class="hdtag">${getTextValue(video.type) || '未知'}</button>
        </a>
        <div class="meta">
          <div class="item-name"><a class="movie-name" title="${getTextValue(video.name)}" href="${baseUrl}?info=${getTextValue(video.id)}">${getTextValue(video.name) || '未知'}</a></div>
          <em>更新：<strong><span>${getTextValue(video.last) || '未知'}</span></strong></em>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div class="pagenav">
    <ul class="pagination">
      <a target="_self" href="${buildPageUrl(c, isSearch ? 'search' : 'list', c.req.query(isSearch ? 'key' : 'sort') || '', 1)}" class="pagelink_a">首页</a>&nbsp;
      <a target="_self" href="${buildPageUrl(c, isSearch ? 'search' : 'list', c.req.query(isSearch ? 'key' : 'sort') || '', pagination.prev)}" class="pagelink_a">上一页</a>&nbsp;
      <span class="page-info">${pagination.current}/${pagination.last}</span>&nbsp;
      <a target="_self" href="${buildPageUrl(c, isSearch ? 'search' : 'list', c.req.query(isSearch ? 'key' : 'sort') || '', pagination.next)}" class="pagelink_a">下一页</a>&nbsp;
      <a target="_self" href="${buildPageUrl(c, isSearch ? 'search' : 'list', c.req.query(isSearch ? 'key' : 'sort') || '', pagination.last)}" class="pagelink_a">尾页</a>
    </ul>
  </div>
</section>`;
}

function renderInfoPage(c: any, videoInfo: Video, playerScript: string, baseUrl: string) {
  return `
<section class="content-box">
  <ol class="breadcrumb">
    <a href="${baseUrl}">首页</a>&nbsp;&nbsp;&raquo;&nbsp;&nbsp;<a href="${baseUrl}?sort=${getTextValue(videoInfo.tid)}">${getTextValue(videoInfo.type) || '未知'}</a>&nbsp;&nbsp;&raquo;&nbsp;&nbsp;${getTextValue(videoInfo.name) || '未知'}
  </ol>
  <div class="content-row">
    <div class="cont-l">
      <div class="con-pic">
        <img class="img-thumbnail" alt="${getTextValue(videoInfo.name) || '未知'}" src="${getTextValue(videoInfo.pic) || 'https://placehold.co/200x280?text=No+Image'}">
      </div>
      <div class="con-dete">
        <div class="con-detail">
          <ul>
            <li class="li_l"><span class="info-label">片名</span></li>
            <li class="li_r">${getTextValue(videoInfo.name) || '未知'}</li>
          </ul>
          <ul>
            <li class="li_l"><span class="info-label">导演</span></li>
            <li class="li_r">${getTextValue(videoInfo.director) || '未知'}</li>
          </ul>
          <ul>
            <li class="li_l"><span class="info-label">主演</span></li>
            <li class="li_r">${getTextValue(videoInfo.actor) || '未知'}</li>
          </ul>
          <ul>
            <li class="li_l"><span class="info-label">类型</span></li>
            <li class="li_r">${getTextValue(videoInfo.type) || '未知'}</li>
          </ul>
          <ul>
            <li class="li_l"><span class="info-label">地区</span></li>
            <li class="li_r">${getTextValue(videoInfo.area) || '未知'}</li>
          </ul>
          <ul>
            <li class="li_l"><span class="info-label">更新时间</span></li>
            <li class="li_r">${getTextValue(videoInfo.last) || '未知'}</li>
          </ul>
        </div>
      </div>
      <div class="con-des">
       <p><strong>剧情介绍：</strong></p>
       <p class="summary">${getTextValue(videoInfo.des) || '暂无描述'}</p>
      </div>
    </div>
  </div>
  <div class="panel" id="iframe" style="display:none;"> 
<iframe src="" width="100%" height="400px" frameborder="no" border="0" marginwidth="0" marginheight="0" scrolling="no" allowfullscreen="true" id="frame"></iframe>
  </div>
  <div class="play-list" id="playlist">
    <div class="panel"> 
      <div class="panel-heading"><strong>
        <mb class="mbnone">《${getTextValue(videoInfo.name) || '未知'}》 - </mb>
       资源加载中：</strong></div>
      <ul class="dslist-group" id="zylx资源加载中">
        <li><a href="#iframe" target="_self" onclick="bf('剧集地址加载中')">剧集加载中</a></li>
      </ul>
      <div class="panel-footer"> <strong>《${getTextValue(videoInfo.name) || '未知'}》 - 资源加载中资源观看帮助：</strong><br/>
        1、有个别电影打开后播放需要等待。<br/>
        2、有的播放不了请多刷新几下，试试。 <br/>
    </div>
   </div>
 </div>
</section>
${playerScript}`;
}

console.log('Server is running on http://localhost:3000');
export default {
  port: 3000,
  fetch: app.fetch
};
