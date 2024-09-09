import { GM_getValue } from '$'
import { modifyShadowDOMLate } from './comment.js'

/**
 * 处理视频的响应操作交互
 */
export function videoInteraction() {
  handlePortrait()

  handlelVideoClick()

  handleVideoInteraction()

  closeMiniPlayer()

  setEndingContent()

  modifyShadowDOMLate()
}

let isPortrait = false

function handlePortrait() {
  const video = document.querySelector('#bilibili-player video')

  // 适配侧边栏切换视频
  video.addEventListener('resize', () => {
    // aspectRatio, resize 前宽高为 0
    isPortrait = video.videoHeight / video.videoWidth > 1
  })
}

// 接管视频点击事件
function handlelVideoClick() {
  const playerContainter = document.querySelector('.bpx-player-container')
  const videoArea = playerContainter.querySelector('.bpx-player-video-area')
  const videoPerch = videoArea.querySelector('.bpx-player-video-perch')
  const videoWrap = videoPerch.querySelector('.bpx-player-video-wrap')
  const video = videoWrap.querySelector('video')

  // 架空双击全屏层以适应竖屏
  videoArea.insertBefore(videoWrap, videoPerch)

  // safari 内联播放
  if (video) {
    video.playsInline = true
  }

  const oldControlWrap = videoArea.querySelector('.bpx-player-control-wrap')
  const controlEntity = oldControlWrap.querySelector(
    '.bpx-player-control-entity',
  ) // 移动后再使用

  let clickTimer = null

  let hideTimer = null

  // 阻止 controlWrap 的 mouseleave 事件隐藏控制栏, mouseleave 事件不会在冒泡阶段和捕获阶段传播
  const controlWrap = Object.assign(document.createElement('div'), {
    className: 'bpx-player-control-wrap new',
    innerHTML: '<div class="bpx-player-control-mask"></div>',
  })
  videoArea.insertBefore(controlWrap, oldControlWrap)
  controlWrap.appendChild(controlEntity)

  // 观察控制栏按键弹窗, 元素发生移动后, 之前的 querySelector 会失效 (无法找到该元素)
  // 当箭头函数的函数体只有一条语句时，如果使用了花括号，则该语句会被解释为函数体，而不是返回值。因此，当使用了花括号时，isBpxStateShow 的返回值为 undefined。
  const isBpxStateShow = () =>
    controlEntity.querySelector(
      '.bpx-player-control-bottom-right>.bpx-state-show',
    )

  const controlTop = controlEntity.querySelector('.bpx-player-control-top')
  const bottomRight = controlEntity.querySelector(
    '.bpx-player-control-bottom-right',
  )

  // 可以作语句的表达式：需要赋值给变量或者作为函数调用的一部分，能够产生一个可以被丢弃的值
  // 布尔值不能直接作为语句，因为它们不执行任何动作，也不改变程序的状态
  // x++ 作语句时执行操作，但是不显式返回值，实际 x 的值隐式地改变了；作表达式时根据前后缀，依次返回 x 的值和执行操作
  const isShown = () => playerContainter.getAttribute('ctrl-shown') === 'true' // controlWrap 的 mouseleave 事件导致点击非视频部分会隐藏控制栏, 实际已不必要

  // 覆盖原显隐
  playerContainter.setAttribute('ctrl-shown', 'false')

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes[0].classList.contains('bpx-player-ctrl-web')) {
        // 还可以让控制栏显示作为网页全屏按钮加载的标志事件
        if (video.paused) {
          showControlWrap()
        }
        // 点击视频关闭字幕设置
        const subtitleBtn = document.querySelector('.bpx-player-ctrl-subtitle')
        if (subtitleBtn) {
          window.addEventListener('click', (event) => {
            if (!subtitleBtn.contains(event.target)) {
              subtitleBtn.dispatchEvent(new MouseEvent('mouseleave'))
            }
          })
        }
        observer.disconnect()
      }
    })
  })
  observer.observe(bottomRight, { childList: true })

  function hideControlWrap(isEnd) {
    if ((!video.paused && !isBpxStateShow()) || isEnd) {
      playerContainter.setAttribute('ctrl-shown', 'false')
      clearTimeout(hideTimer)
    } else {
      delayHideTimer()
    }
  }

  video.addEventListener('ended', () => {
    hideControlWrap(true)
  })

  function showControlWrap() {
    playerContainter.setAttribute('ctrl-shown', 'true')
    delayHideTimer()
  }

  function delayHideTimer() {
    clearTimeout(hideTimer)
    hideTimer = setTimeout(hideControlWrap, 3000)
  }

  // 阻止触摸单击触发 videoArea 的 mousemove 事件而显隐控制栏
  videoWrap.addEventListener('mousemove', (event) => {
    event.stopPropagation()
  })
  controlWrap.addEventListener('mousemove', (event) => {
    event.stopPropagation()
  })

  video.addEventListener('play', delayHideTimer)

  controlWrap.addEventListener('click', (event) => {
    event.stopPropagation()
    delayHideTimer()
  })

  controlTop.addEventListener('touchstart', delayHideTimer)

  // 单击监听
  videoWrap.addEventListener('click', () => {
    clearTimeout(clickTimer)

    clickTimer = setTimeout(() => {
      if (isShown()) hideControlWrap()
      else showControlWrap()

      if (!GM_getValue('ban-video-click-play', false)) {
        if (video.paused) video.play()
        else video.pause()
      } // videoPerch.click()
    }, 250)
  })

  // 双击监听
  videoWrap.addEventListener('dblclick', () => {
    clearTimeout(clickTimer)

    // 双击打开声音
    video.muted = false
    if (video.volume === 0) {
      document.querySelector('.bpx-player-ctrl-muted-icon').click()
    }

    if (isPortrait) document.querySelector('.bpx-player-ctrl-web').click()
    // view 省略时指向当前窗口
    else videoPerch.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })

  // 阻止视频响应滑动侧边栏
  // 阻止冒泡只对当前监听器生效，禁止全屏滑动和拖动进度条触发侧边栏。要传递参数或用形参，就要用函数而非引用
  videoArea.addEventListener('touchstart', (event) => {
    event.stopPropagation()
  })
}

function closeMiniPlayer() {
  // 关闭小窗: getElement 提前使用在元素加载后能获取到, querySelector 在元素加载后使用才能获取到
  if (!localStorage.getItem('is-mini-player-closed')) {
    const miniPlayerBtn =
      document.getElementsByClassName('mini-player-window')[0]
    new MutationObserver((mutations) =>
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('on')) {
          miniPlayerBtn.click()
          localStorage.setItem('is-mini-player-closed', true)
        }
      }),
    ).observe(miniPlayerBtn, { attributes: true, attributeFilter: ['class'] })
  }
}

function handleVideoInteraction() {
  const video = document.querySelector('video')
  let startX, startY, startTime
  const threshold = 10 // 滑动阈值
  const initialCheckDuration = 300 // 前 x 秒，例如 300 毫秒
  let isLongPress = false
  let isSliding = false
  let timeoutId
  let times
  let isSlideAllowed
  let progressInfo
  let progressInfoCreated = false // 标志是否已创建 progressInfo 元素
  let isCreatingProgressInfo = false // 避免 progressInfo 创建完成前被重复创建

  video.addEventListener('touchstart', (event) => {
    startX = event.touches[0].clientX
    startY = event.touches[0].clientY
    startTime = video.currentTime
    times = Number(GM_getValue('video-longpress-speed', '2'))
    isSlideAllowed = GM_getValue('allow-video-slid', false)

    // 设置初始检测定时器
    timeoutId = setTimeout(() => {
      // 如果前 x 秒内没有超出阈值，则认为是长按
      video.playbackRate = video.playbackRate * times
      isLongPress = true
    }, initialCheckDuration)
  })

  video.addEventListener('touchmove', (event) => {
    if (!isSlideAllowed) {
      return
    }

    const moveX = event.touches[0].clientX
    const moveY = event.touches[0].clientY
    const deltaX = moveX - startX
    const deltaY = moveY - startY

    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (!isLongPress) {
        // 如果前 x 秒内超出阈值，则取消长按和初始检测
        clearTimeout(timeoutId)
        isSliding = true
      } else {
        // 如果已经是长按状态，则不处理超出阈值的移动
        return
      }

      if (isSliding) {
        // 第一次滑动时创建 progressInfo 元素
        if (!progressInfoCreated && !isCreatingProgressInfo) {
          isCreatingProgressInfo = true
          progressInfo = document.createElement('div')
          progressInfo.id = 'progress-info'
          video.parentNode.insertBefore(progressInfo, video.nextSibling)
          progressInfoCreated = true
          isCreatingProgressInfo = false
        }

        video.pause()
        const progressChange = (deltaX / video.clientWidth) * video.duration
        video.currentTime = startTime + progressChange

        if (progressInfoCreated) {
          // 显示进度信息
          progressInfo.textContent = `进度: ${formatTime(video.currentTime)} / ${formatTime(video.duration)}`
          progressInfo.style.display = 'block'
        }
      }
    }
  })

  video.addEventListener('touchend', () => {
    clearTimeout(timeoutId)

    if (isLongPress) {
      video.playbackRate = video.playbackRate / times
      isLongPress = false
    }

    if (isSliding) {
      video.play()
      // 隐藏进度信息
      progressInfo.style.display = ''
      isSliding = false
    }
  })

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
}

function setEndingContent() {
  addEndingScale()

  function addEndingScale() {
    const style = Object.assign(document.createElement('style'), {
      id: 'ending-content-scale',
      textContent: `
        .bpx-player-ending-content[screen-mode=little-screen] { transform: scale(calc(${window.innerWidth}/536*0.9)) !important; }
        .bpx-player-ending-content { transform: scale(calc(${window.innerWidth}/710*0.9)) !important; }
        .bpx-player-container[data-screen=full] .bpx-player-ending-content { transform: scale(calc(${window.innerWidth}/952*0.9)) !important; }
      `,
    })
    document.head.appendChild(style)
  }

  function renewEndingScale() {
    document.head.querySelector('#ending-content-scale').remove()
    addEndingScale()
  }

  screen.orientation.addEventListener('change', renewEndingScale)
  window.addEventListener('resize', renewEndingScale)
}
