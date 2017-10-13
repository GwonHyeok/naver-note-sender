const rp = require('request-promise')
const NodeRsa = require('node-rsa')
const cheerio = require('cheerio')
const qs = require('querystring')
const getLenChar = value => String.fromCharCode(`${value}`.length)
const HttpClient = (proxy) => {
  return async function (options) {
    return proxy && proxy.ip ? rp(Object.assign({}, options, {proxy: `http://${proxy ? proxy.ip : ''}:${proxy ? proxy.port : ''}`})) : rp(options)
  }
}

export async function doLogin (id, password, options) {
  const cookieJar = rp.jar()
  const {proxy} = options
  const proxyRequest = HttpClient(proxy)

  // 세션 키 발급
  const keys = await proxyRequest({url: 'https://nid.naver.com/login/ext/keys.nhn', jar: cookieJar})

  // 키 분리
  const segmentalizedKeys = keys.split(',')

  // 키 분리 데이터
  const sessionkey = segmentalizedKeys[0]
  const keyname = segmentalizedKeys[1]
  const nvalue = segmentalizedKeys[2]
  const evalue = segmentalizedKeys[3]

  // RSA Public Key 설정
  const key = new NodeRsa()
  key.importKey({
    e: Buffer.from(evalue, 'hex'),
    n: Buffer.from(nvalue, 'hex')
  }, 'components-public')
  key.setOptions({encryptionScheme: 'pkcs1'})

  // 아이디 비밀번호 암호화
  const encpw = key.encrypt(
    `${getLenChar(sessionkey)}${sessionkey}${getLenChar(id)}${id}${getLenChar(password)}${password}`,
    'hex'
  )

  // 로그인 요청
  const loginResponse = await proxyRequest({
    method: 'POST',
    url: 'https://nid.naver.com/nidlogin.login',
    jar: cookieJar,
    formData: {
      encnm: keyname,
      enctp: 1,
      encpw: encpw,
      exp: '',
      locale: 'ko_KR',
      localechange: '',
      logintp: '',
      ls: '',
      postDataKey: '',
      pre_id: '',
      pw: '',
      resp: '',
      ru: '',
      smart_LEVEL: -1,
      svc: '',
      svctype: 0,
      theme_mode: '',
      url: 'https://www.naver.com',
      viewtype: 0
    },
    headers: {
      'Origin': 'https://www.naver.com',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Referer': 'https://www.naver.com/',
      'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.6,en;q=0.4'
    }
  })

  // 로그인 결과에서 로그인 승인 url 추출
  const extractLoginFinalizeUrl = /location.replace\("(.*)"\)/g.exec(loginResponse)
  const finalizeUrl = extractLoginFinalizeUrl ? extractLoginFinalizeUrl[1] : null

  // url 추출에 실패했다면 로그인에 실패했다
  if (!finalizeUrl) throw new Error(`로그인에 실패하였습니다 : ${loginResponse}`)

  // 로그인 승인
  await proxyRequest({url: finalizeUrl, jar: cookieJar})

  return {message: '로그인에 성공하였습니다', cookieJar: cookieJar}
}

export async function doSendNote (cookieJar, options) {
// eslint-disable-next-line no-unused-vars
  const {targetId, note, proxy} = options
  const proxyRequest = HttpClient(proxy)

  // 데이터가 없을때 에러 발생
  if (!note) throw new Error('쪽지 정보가 없습니다')
  if (!targetId) throw new Error('타겟 정보가 없습니다')

  // 쪽지 작성 페이지 접속
  const $noteForm = await proxyRequest({
    url: 'http://m.note.naver.com/mobile/mobileSendNoteForm.nhn?returnUrl=http%3a%2f%2fm.note.naver.com%2fmobile%2fmobileReceiveList.nhn',
    jar: cookieJar,
    transform: (body) => cheerio.load(body)
  })

  // 노트 작성에 필요한 인풋 데이터
  const sendNoteFormInputs = $noteForm('form[name="sendForm"]').serializeArray()
  if (sendNoteFormInputs.length === 0) throw new Error('쪽지 인풋 정보를 가져올 수 없습니다.')
  const sendNoteFormData = sendNoteFormInputs.reduce((original, input) => {
    original[input.name] = input.value
    return original
  }, {})

  // 쪽지 전송
  const noteSendResponse = await proxyRequest({
    method: 'POST',
    url: `http://m.note.naver.com/mobile/mobileCaptchaViewCheck.nhn?${qs.stringify(Object.assign({}, sendNoteFormData, {
      targetId: typeof targetId === 'string' ? targetId : targetId.length === 1 ? targetId[0].id : targetId.map(user => user.id).join(','),
      note: note
    }))}`,
    jar: cookieJar,
    headers: {
      'charset': 'utf-8',
      'Origin': 'http://m.note.naver.com',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Mobile Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'Referer': 'http://m.note.naver.com/mobile/mobileSendNoteForm.nhn?returnUrl=http%3a%2f%2fm.note.naver.com%2fmobile%2fmobileReceiveList.nhn',
      'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.6,en;q=0.4'
    }
  })

  if (noteSendResponse.indexOf('쪽지가 성공적으로 발송되었습니다') !== -1) {
    return {message: '쪽지 전송 성공'}
  } else {
    throw new Error('쪽지 전송에 실패하였습니다')
  }
}
