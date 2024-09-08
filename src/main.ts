// @grant 表示全局作用域运行，而不在隔离沙盒内使用特定 API

import './style/app.css';
import './style/header.css';
import './style/home.css';
import './style/search.css';
import './style/space.css';
import './style/message.css';
import './style/video/video.css';
import './style/video/control.css';
import './style/video/list.css';

import { preventBeforeUnload, countViewTime, increaseVideoLoadSize, handleScroll } from './window.js';
import { handleScriptPreSetting, handleScriptSetting, setScriptHelp } from './setting.js';
import { handleActionbar } from './actionbar/actionbar.js';
import { preloadAnchor, handleHeaderImage, handleVideoCard } from './home.js';
import { videoInteraction } from './video.js';
import { createUnfoldBtn } from './message.js';
import { waitDOMContentLoaded } from './utils.js';

(function () {
  // setInterval(() => { debugger }, 100)

  if (window.top !== window.self) { return; } // 检查当前执行环境是否为顶级窗口

  /* initViewport */ document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'viewport', content: 'width=device-width, initial-scale=1' }));

  preventBeforeUnload();
  countViewTime();

  /* iconfont */document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://s1.hdslb.com/bfs/static/jinkela/space/css/space.8.22c06a62b42dec796d083a84f5a769f44a97b325.css' }));

  console.log('Bilibili mobile execute!');

  // 简单表达式: 常量折叠，解析引擎优化为只计算一次，然后缓存入临时变量。函数调用、对象属性访问等不适用。
  const firstSubdomain = location.hostname.substring(0, location.hostname.indexOf('.'));

  const pathToTypeMap = {
    '/video': 'video',
    '/list': 'list'
  };

  const getTypeFromPath = (map: { '/video': string; '/list': string; }) => {
    for (const [prefix, type] of Object.entries(map)) {
      if (location.pathname.startsWith(prefix)) { return type; }
    }
    return 'unknow';
  };

  const type = firstSubdomain === 'www'
    ? location.pathname === '/' ? 'home' : getTypeFromPath(pathToTypeMap)
    : firstSubdomain;

  function handleCommonSettings (type: string) {
    handleScriptPreSetting();
    waitDOMContentLoaded(() => {
      handleScriptSetting();
      handleActionbar(type);
      handleScroll(type);
      setScriptHelp();
    });
  }

  const handleVideoInteraction = (type: string) => {
    waitDOMContentLoaded(() => videoInteraction(type));
  };

  handleCommonSettings(type);
  switch (type) {
    case 'home':
      increaseVideoLoadSize();
      handleHeaderImage();
      waitDOMContentLoaded(() => {
        preloadAnchor();
        handleVideoCard();
      });
      break;
    case 'video':
    case 'list':
      handleVideoInteraction(type);
      break;
    case 'message': waitDOMContentLoaded(createUnfoldBtn);
      break;
    default:
      break;
  }
})();
