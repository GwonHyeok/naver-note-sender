/* eslint-disable no-unused-vars */
'use strict'

import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import csv from 'fast-csv'
import rp from 'request-promise'
import { doLogin, doSendNote } from './naver'
import Store from 'electron-store'
import json2csv from 'json2csv'
import fs from 'fs'
import { machineIdSync } from 'node-machine-id'

// Global App Data Store
const appDataStore = new Store()

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/** c
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */

ipcMain.on('sync-proxy-server', (event, data) => {

})

// csv 에서 유저 정보 파싱
ipcMain.on('request-users-from-csv', (event, path) => {
  csv.fromPath(path, {headers: true})
    .on('data', function (data) {
      // 인코딩 관련 문제로 첫번째 열이 무조건 아이디로 가정하고 작업
      const idKey = Object.keys(data)[0]
      event.sender.send('response-user', {id: data[idKey], isSuccess: null, usedProxy: null, usedNaverUser: null})
    })
    .on('end', function () {
      event.sender.send('complete-user')
    })
})

// 프록시 상태 업데이트
ipcMain.on('request-check-proxies', async (event, proxies) => {
  for (let i = 0; i < proxies.length; i++) {
    const {ip, port} = proxies[i]
    const startTimeMills = Date.now()
    try {
      const response = await rp({
        url: 'http://www.naver.com',
        proxy: `http://${ip}:${port}`,
        timeout: 3000
      })
      event.sender.send('response-check-proxy', {
        ip,
        port,
        response,
        isWorking: true,
        responseTimeMills: Date.now() - startTimeMills
      })
    } catch (e) {
      console.error(e)
      event.sender.send('response-check-proxy', {
        ip,
        port,
        error: e,
        isWorking: false,
        responseTimeMills: Date.now() - startTimeMills
      })
    }
  }
})

// 쪽지 전송 요청
ipcMain.on('request-send-message', async (event, naverUsers, proxies, users, message) => {
  // 유저 정보를 최대 50명씩 새로운 어레이로 만듬
  let userGroups = []
  let userGroupsQueue = []
  while (users.length > 0) userGroups.push(users.splice(0, 50))

  // 네이버 계정 갯수가 충분한지 확인
  if (naverUsers.length < userGroups.length) return event.sender.send('fail-send-message', '보내려는 유저에 비해 네이버 계정 갯수가 부족합니다')

  // 한 프록시 아이피당 300개의 쪽지를 보낼 수 있다고 가정
  // 프록시 아이피 갯수가 userGroups.length / 6 < proxies.length 이어야 모든 쪽지를 보낼 수 있다
  if (userGroups.length / 6 > proxies.length) return event.sender.send('fail-send-message', '보내려는 유저에 비해 프록시 아이피 갯수가 부족합니다')

  // 각 유저 그룹에 프록시 서버 정보를 추가해서 저장함
  for (let i = 0; i < userGroups.length; i++) {
    const groups = userGroups[i]
    const proxy = proxies[parseInt(i / 6)]
    const naverUser = naverUsers[i]
    userGroupsQueue.push({naverUser, groups, proxy, message})
  }

  // 유저 그룹 큐를 이용하여, 프록시 아이피 포트로 네이버에 로그인 후, 쪽지를 보냄 반복함
  // 만약 실패하 그룹이 있다면 failedUserGroups 에 추가함
  for (let i = 0; i < userGroupsQueue.length; i++) {
    try {
      const {naverUser, groups, proxy, message} = userGroupsQueue[i]

      // 네이버 로그인, 쪽지 보내기 실행
      const naverLoginResponse = await doLogin(naverUser.id, naverUser.password, {proxy})
      const sendNote = await doSendNote(naverLoginResponse.cookieJar, {proxy, note: message, targetId: groups})

      // 성공 한 경우 이므로 Renderer 에 성공했다고 보내줌
      event.sender.send('success-send-message-group', userGroupsQueue[i], i, 50)
      console.log('쪽지 보낸 결과', sendNote)
    } catch (err) {
      console.log('쪽지 보내기에 실패한 그룹이 있습니다')

      // 실패 한 경우 이므로 Renderer 에 실패 보냄
      event.sender.send('fail-send-message-group', err, userGroupsQueue[i], i, 50)
    }
  }
})

// 프록시 리스트 저장
ipcMain.on('save-proxies', (event, proxies) => appDataStore.set('proxies', proxies))

// 네이버 계정 리스트 저장
ipcMain.on('save-naver-users', (event, naverUsers) => appDataStore.set('naverUsers', naverUsers))

// 프록시 리스트 불러오기
ipcMain.on('get-saved-proxies', (event) => event.sender.send('get-saved-proxies', appDataStore.get('proxies')))

// 네이버 계정 리스트 불러오기
ipcMain.on('get-naver-users', (event) => event.sender.send('get-naver-users', appDataStore.get('naverUsers')))

// 결과 저장
ipcMain.on('download-send-result', (event, users) => {
  const options = {properties: ['openDirectory']}
  dialog.showOpenDialog(mainWindow, options, (filePaths) => {
    // 파일 경로가 제대로 넘어왔을 경우
    if (filePaths.length > 0) {
      // 파일 이름 생성
      const date = new Date()
      let month = `${date.getMonth() + 1}`
      let day = `${date.getDate()}`
      const year = `${date.getFullYear()}`
      let hours = `${date.getHours()}`
      let minutes = `${date.getMinutes()}`

      if (month.length < 2) month = `0${month}`
      if (day.length < 2) day = `0${day}`
      if (hours.length < 2) hours = `0${hours}`
      if (minutes.length < 2) minutes = `0${minutes}`

      // 파일 이름
      const fileName = `${year}${month}${day}_${hours}${minutes}_전송결과.csv`

      const fields = ['id', 'usedNaverUser', 'usedProxy', 'isSuccess']
      const fieldNames = ['받는사람', '보낸사람', '프록시', '성공여부']

      // 파일 저장 작업
      const filePath = filePaths[0]
      const csv = json2csv({data: users, withBOM: true, fields, fieldNames})
      fs.writeFile(`${filePath}/${fileName}`, csv, (error) => {
        if (error) return console.error(error)
        console.log('완료함')
      })
    } else {
      console.error('사용자에 의해 취소됨')
    }
  })
})

ipcMain.on('request-proxies-from-file', (event, path) => {
  fs.readFile(path, 'utf8', (err, data) => {
    if (err) console.error('fail')
    const proxies = data.split(/\r?\n/).map(item => {
      const proxyInfo = item.split(':')
      return {ip: proxyInfo[0], port: proxyInfo[1], responseTimeMills: 0}
    })
    event.sender.send('get-saved-proxies', proxies)
  })
})

// MacAddress 요청
ipcMain.on('request-machine-id', (event) => {
  event.sender.send('response-machine-id', machineIdSync())
})
